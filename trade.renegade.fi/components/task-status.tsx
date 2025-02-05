import { useEffect, useRef, useState } from "react"
import { useRenegade } from "@/contexts/Renegade/renegade-context"
import { TaskState, TaskType } from "@/contexts/Renegade/types"
import {
  Box,
  CircularProgress,
  CircularProgressLabel,
  Flex,
  Text,
} from "@chakra-ui/react"

import { useOrders } from "@/hooks/use-order"

const TASK_TO_LATENCY = {
  [TaskType.InitializeAccount]: {
    [TaskState.Proving]: 41000,
    [TaskState.SubmittingTx]: 4000,
    // @ts-ignore
    FindingMerkleOpening: 4000,
    [TaskState.FindingOpening]: 4000,
    [TaskState.UpdatingValidityProofs]: 0,
    [TaskState.Completed]: 0,
  },
  [TaskType.Deposit]: {
    [TaskState.Proving]: 22000,
    [TaskState.SubmittingTx]: 1000,
    [TaskState.FindingOpening]: 1000,
    [TaskState.UpdatingValidityProofs]: 48000,
    [TaskState.Completed]: 0,
  },
  [TaskType.Withdrawal]: {
    [TaskState.Proving]: 22000,
    [TaskState.SubmittingTx]: 1000,
    [TaskState.FindingOpening]: 1000,
    [TaskState.UpdatingValidityProofs]: 48000,
    [TaskState.Completed]: 0,
  },
  [TaskType.PlaceOrder]: {
    [TaskState.Proving]: 22000,
    [TaskState.SubmittingTx]: 1000,
    [TaskState.FindingOpening]: 0,
    [TaskState.UpdatingValidityProofs]: 48000,
    [TaskState.Completed]: 0,
  },
  [TaskType.ModifyOrder]: {
    [TaskState.Proving]: 22000,
    [TaskState.SubmittingTx]: 1000,
    [TaskState.FindingOpening]: 0,
    [TaskState.UpdatingValidityProofs]: 48000,
    [TaskState.Completed]: 0,
  },
  [TaskType.CancelOrder]: {
    [TaskState.Proving]: 22000,
    [TaskState.SubmittingTx]: 1000,
    [TaskState.FindingOpening]: 0,
    [TaskState.UpdatingValidityProofs]: 48000,
    [TaskState.Completed]: 0,
  },
  [TaskType.ApproveFee]: {
    [TaskState.Proving]: 0,
    [TaskState.SubmittingTx]: 0,
    [TaskState.FindingOpening]: 0,
    [TaskState.UpdatingValidityProofs]: 0,
    [TaskState.Completed]: 0,
  },
  [TaskType.ModifyFee]: {
    [TaskState.Proving]: 0,
    [TaskState.SubmittingTx]: 0,
    [TaskState.FindingOpening]: 0,
    [TaskState.UpdatingValidityProofs]: 0,
    [TaskState.Completed]: 0,
  },
  [TaskType.RevokeFee]: {
    [TaskState.Proving]: 0,
    [TaskState.SubmittingTx]: 0,
    [TaskState.FindingOpening]: 0,
    [TaskState.UpdatingValidityProofs]: 0,
    [TaskState.Completed]: 0,
  },
}

export const TaskStatus = () => {
  const orders = useOrders()
  const { taskType, taskState } = useRenegade()
  const prevTaskType = useRef<TaskType | undefined>()
  const prevTaskState = useRef<TaskState | undefined>()
  const [taskStartTime, setTaskStartTime] = useState<number | undefined>()
  const [currentTime, setCurrentTime] = useState<number | undefined>()

  useEffect(() => {
    const refreshCurrentTime = () => {
      setCurrentTime(Date.now())
      setTimeout(refreshCurrentTime, 100)
    }
    refreshCurrentTime()
  }, [taskStartTime])

  useEffect(() => {
    if (
      (taskState === prevTaskState.current &&
        taskType === prevTaskType.current) ||
      !taskState ||
      !taskType
    ) {
      return
    }
    const currentTime = Date.now()
    // TODO: Test this
    const nextTaskDuration = TASK_TO_LATENCY[taskType][taskState]
    if (nextTaskDuration < 5000) {
      return // Stay on the current status until the next status update occurs
    }
    setTaskStartTime(currentTime)
    prevTaskState.current = taskState
    prevTaskType.current = taskType
  }, [currentTime, taskState, taskType])

  let progress = 0
  if (taskType && taskState && currentTime && taskStartTime) {
    progress =
      (100 * (currentTime - taskStartTime)) /
      TASK_TO_LATENCY[taskType][taskState]
    progress = Math.min(Math.ceil(progress), 100)
  }
  if (taskState === TaskState.Completed) {
    progress = 100
  }
  // If we're updating validity proofs, and there are no orders, this operation will completely immediately.
  if (
    taskState === TaskState.UpdatingValidityProofs &&
    Object.keys(orders).length === 0
  ) {
    progress = 100
  }

  const displayedTaskType = {
    [TaskType.InitializeAccount]: "Creating a New Account",
    [TaskType.Deposit]: "Depositing Tokens",
    [TaskType.Withdrawal]: "Withdrawing Tokens",
    [TaskType.PlaceOrder]: "Placing Order",
    [TaskType.ModifyOrder]: "Modifying Order",
    [TaskType.CancelOrder]: "Cancelling Order",
    [TaskType.ApproveFee]: "Approving Fee",
    [TaskType.ModifyFee]: "Modifying Fee",
    [TaskType.RevokeFee]: "Revoking Fee",
  }[taskType || TaskType.InitializeAccount] // If taskType is undefined, we won't use this displayedTaskType anyway.

  const displayedTaskState = {
    [TaskState.Proving]: "Generating ZK Proof",
    [TaskState.SubmittingTx]: "Submitting Transaction",
    [TaskState.FindingOpening]: "Finding New Merkle Opening",
    // TODO: Make sure this works for CreateNewWalletTask
    // @ts-ignore
    [TaskState.FindingMerkleOpening]: "Finding New Merkle Opening",
    [TaskState.UpdatingValidityProofs]: "Updating Validity Proofs",
    [TaskState.Completed]: "Completed",
  }[taskState || TaskState.Proving] // If taskState is undefined, we won't use this displayedTaskState anyway.

  const isDisplayed = taskState && taskState !== TaskState.Completed

  return (
    <Flex
      alignItems="center"
      justifyContent="center"
      flexDirection="row"
      gap="10px"
      margin="0 40px 30px 0"
      opacity={isDisplayed ? 1 : 0}
      transform={isDisplayed ? "translateX(0)" : "translateX(30%)"}
      transition="all 0.25s ease-in-out"
      transitionDelay={isDisplayed ? "0s" : "5s"}
    >
      <CircularProgress
        color="green"
        capIsRound={true}
        isIndeterminate={progress === 100 && taskState !== TaskState.Completed}
        size="40px"
        thickness="8px"
        trackColor="white.10"
        value={progress}
      >
        <CircularProgressLabel color="white.60" fontSize="0.3em">
          {progress === 100 && taskState !== TaskState.Completed
            ? 99
            : progress}
        </CircularProgressLabel>
      </CircularProgress>
      <Box alignItems="start" justifyContent="center" flexDirection="column">
        <Text fontFamily="Favorit Expanded" fontSize="1.1em">
          {displayedTaskType}
        </Text>
        <Text color="white.60" fontSize="0.9em">
          {displayedTaskState}
        </Text>
      </Box>
    </Flex>
  )
}
