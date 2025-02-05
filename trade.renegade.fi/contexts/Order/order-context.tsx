"use client"

import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { useParams, useRouter } from "next/navigation"
import { CounterpartyOrder } from "@/contexts/Renegade/types"
import { useToast } from "@chakra-ui/react"
import { CallbackId, OrderId } from "@renegade-fi/renegade-js"

import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "@/lib/utils"
import { renegade } from "@/app/providers"

import { Direction, OrderContextValue } from "./types"

const OrderStateContext = createContext<OrderContextValue | undefined>(
  undefined
)

function OrderProvider({ children }: PropsWithChildren) {
  const params = useParams()
  const router = useRouter()
  const [direction, setDirection] = useState<Direction>(
    safeLocalStorageGetItem("direction") === "buy"
      ? Direction.BUY
      : Direction.SELL
  )
  const baseTicker = params.base?.toString()
  const handleSetBaseToken = (token: string) => {
    router.push(`/${token}/${quoteTicker}`)
  }
  const quoteTicker = params.quote?.toString()
  const handleSetQuoteToken = (token: string) => {
    router.push(`/${baseTicker}/${token}`)
  }
  const [baseTokenAmount, setBaseTokenAmount] = useState(0)

  const [orderBook, setOrderBook] = useState<
    Record<OrderId, CounterpartyOrder>
  >({})

  useEffect(() => {
    if (!baseTicker || !quoteTicker) return
    const regex = /[a-z]/
    if (regex.test(baseTicker) || regex.test(quoteTicker)) {
      router.replace(
        `/${baseTicker.toUpperCase()}/${quoteTicker.toUpperCase()}`
      )
    }
  }, [baseTicker, quoteTicker, router])

  const orderCallbackId = useRef<CallbackId>()
  useEffect(() => {
    if (orderCallbackId.current) return
    const handleNetworkListener = async () => {
      await renegade
        .registerOrderBookCallback((message: string) => {
          const orderBookEvent = JSON.parse(message)
          const orderBookEventType = orderBookEvent.type
          const orderBookEventOrder = orderBookEvent.order
          if (
            orderBookEventType === "NewOrder" ||
            orderBookEventType === "OrderStateChange"
          ) {
            setOrderBook((orderBook) => {
              const newOrderBook = { ...orderBook }
              newOrderBook[orderBookEventOrder.id] = {
                orderId: orderBookEventOrder.id,
                publicShareNullifier:
                  orderBookEventOrder.public_share_nullifier,
                isLocal: orderBookEventOrder.local,
                clusterId: orderBookEventOrder.cluster,
                state: orderBookEventOrder.state,
                timestamp: orderBookEventOrder.timestamp,
                handshakeState: "not-matching",
              } as CounterpartyOrder
              return newOrderBook
            })
          } else {
            console.error("Unknown order book event type:", orderBookEventType)
          }
        })
        .then((callbackId) => (orderCallbackId.current = callbackId))
    }
    handleNetworkListener()
    return () => {
      if (!orderCallbackId.current) return
      renegade.releaseCallback(orderCallbackId.current)
      orderCallbackId.current = undefined
    }
  }, [])

  const mpcCallbackId = useRef<CallbackId>()
  const toast = useToast()
  useEffect(() => {
    if (mpcCallbackId.current) return
    const handleMpcCallback = async () => {
      await renegade
        .registerMpcCallback((message: string) => {
          let lastToastTime = 0
          console.log("[MPC]", message)
          const mpcEvent = JSON.parse(message)
          const mpcEventOrderId = mpcEvent.local_order_id
          if (Date.now() - lastToastTime < 500) {
            return
          } else {
            lastToastTime = Date.now()
          }
          const toastId =
            mpcEvent.type === "HandshakeCompleted"
              ? "handshake-completed"
              : "handshake-started"
          if (!toast.isActive(toastId)) {
            toast({
              id: toastId,
              title: `MPC ${
                mpcEvent.type === "HandshakeCompleted" ? "Finished" : "Started"
              }`,
              description: `A handshake with a counterparty has ${
                mpcEvent.type === "HandshakeCompleted" ? "completed" : "begun"
              }.`,
              status: "info",
              duration: 5000,
              isClosable: true,
            })
          }
          if (orderBook[mpcEventOrderId]) {
            const handshakeState =
              mpcEvent.type === "HandshakeCompleted"
                ? "completed"
                : "in-progress"
            setOrderBook((orderBook) => {
              const newOrderBook = { ...orderBook }
              newOrderBook[mpcEventOrderId].handshakeState = handshakeState
              return newOrderBook
            })
          }
        })
        .then((callbackId) => (mpcCallbackId.current = callbackId))
    }
    handleMpcCallback()
    return () => {
      if (!mpcCallbackId.current) return
      renegade.releaseCallback(mpcCallbackId.current)
      mpcCallbackId.current = undefined
    }
  }, [orderBook, toast])

  const handleSetDirection = useCallback((direction: Direction) => {
    setDirection(direction)
    safeLocalStorageSetItem("direction", direction)
  }, [])

  return (
    <OrderStateContext.Provider
      value={{
        baseTicker,
        baseTokenAmount,
        direction,
        quoteTicker,
        setBaseToken: handleSetBaseToken,
        setBaseTokenAmount,
        setDirection: handleSetDirection,
        setQuoteToken: handleSetQuoteToken,
      }}
    >
      {children}
    </OrderStateContext.Provider>
  )
}

function useOrder() {
  const context = useContext(OrderStateContext)
  if (context === undefined) {
    throw new Error("useOrder must be used within a OrderProvider")
  }
  return context
}

export { OrderProvider, useOrder }
