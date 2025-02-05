import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  CallbackId,
  Exchange,
  PriceReport,
  Token,
} from "@renegade-fi/renegade-js"

import { renegade } from "@/app/providers"

import { ExchangeContextValue } from "./types"

const UPDATE_THRESHOLD_MS = 1000

const ExchangeContext = createContext<ExchangeContextValue | undefined>(
  undefined
)

function ExchangeProvider({ children }: PropsWithChildren) {
  const callbackIdRefs = useRef<{ [key: string]: CallbackId }>({})
  const [priceReport, setPriceReport] = useState<{
    [key: string]: PriceReport
  }>({})

  const handlePriceListener = useCallback(
    async (
      exchange: Exchange,
      base: string,
      quote: string,
      decimals?: number
    ) => {
      const key = getKey(exchange, base, quote)
      if (callbackIdRefs.current[key]) {
        return
      }

      let lastUpdate = 0

      const callbackId = await renegade
        .registerPriceReportCallback(
          (message: string) => {
            const priceReport = JSON.parse(message) as PriceReport
            const now = Date.now()
            if (now - lastUpdate <= UPDATE_THRESHOLD_MS) {
              return
            }
            lastUpdate = now

            // Store the price report if it's different from the previous one
            setPriceReport((prev) => {
              if (
                !prev[key] ||
                prev[key].midpointPrice?.toFixed(decimals || 2) !==
                  priceReport.midpointPrice?.toFixed(decimals || 2)
              ) {
                return {
                  ...prev,
                  [key]: priceReport,
                }
              }
              return prev
            })
          },
          exchange,
          new Token({ ticker: base }),
          new Token({ ticker: quote })
        )
        .then((callbackId) => {
          if (callbackId) {
            callbackIdRefs.current[key] = callbackId
            return callbackId
          }
        })
        .catch(() => {
          return undefined
        })
      return callbackId
    },
    []
  )

  useEffect(() => {
    return () => {
      Object.values(callbackIdRefs.current).forEach((callbackId) => {
        renegade.releaseCallback(callbackId)
      })
      callbackIdRefs.current = {}
    }
  }, [handlePriceListener])

  return (
    <ExchangeContext.Provider
      value={{
        onRegisterPriceListener: handlePriceListener,
        getPriceData: (
          exchange: Exchange,
          baseTicker: string,
          quoteTicker: string
        ): PriceReport | undefined => {
          const key = getKey(exchange, baseTicker, quoteTicker)
          return priceReport[key]
        },
      }}
    >
      {children}
    </ExchangeContext.Provider>
  )
}

function useExchange() {
  const context = useContext(ExchangeContext)
  if (context === undefined) {
    throw new Error("useExchange must be used within a ExchangeProvider")
  }
  return context
}

export { ExchangeProvider, useExchange }

function getKey(exchange: Exchange, base: string, quote: string) {
  return `${exchange}-${base}-${quote}`
}
