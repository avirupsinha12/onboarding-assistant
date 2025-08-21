import { defaultStep } from "../constants/Default";
import { 
  Status, 
  Step, 
  Flow, 
  StepGeneratorData, 
  SerialComponents, 
  ComponentListData, 
} from "../types/Types";
import { customCompare, addTime } from "../utility/Utils"

export function isExecutable(status: Status): boolean {
  return status === "PENDING" || status === "INCOMPLETE" || status === "OVERDUE"
}


export function getFirstActiveSubStepInfo(
  stepPropsArray: StepGeneratorData[],
  stepDict: Record<string, Step>,
): Step | undefined {
  const activeStep = stepPropsArray.find((stepProps) =>
    isExecutable(stepProps.step.status),
  )?.step

  if (!activeStep) return undefined

  const childSteps = activeStep.child_step_ids
    ?.map((id) => stepDict[id])
    .filter(Boolean) || [activeStep]

  return childSteps
    .sort((a, b) => customCompare(a.position, b.position))
    .find((step) => isExecutable(step.status))
}

export function fillConnectedChildSteps(
  childStepIds: string[],
  connectedStepList: string[],
  stepDict: Record<string, Step>,
): void {
  connectedStepList.push(...childStepIds)

  childStepIds.forEach((childStepId) => {
    const childStep = stepDict[childStepId]
    if (childStep?.child_step_ids) {
      fillConnectedChildSteps(
        childStep.child_step_ids,
        connectedStepList,
        stepDict,
      )
    }
  })
}


export function flowBFS(
  stepDict: Record<string, Step>,
  flow: Flow,
): [ComponentListData[], number, number, string] {
  const rootStep = stepDict[flow.root_step_id] || defaultStep
  const traversedArray = [rootStep.id]
  const componentList: ComponentListData[] = []
  const connectedStepList = [rootStep.id]

  let offSet = 0
  let stepNumber = 1
  let doneCount = rootStep.status === "DONE" ? 1 : 0
  let serialSteps: SerialComponents[] = [
    {
      type: "Step",
      data: {
        step: rootStep,
        stepNumber,
        isRootStep: true,
        isLastStep: false,
        isConnectedStep: true,
      },
    },
  ]
  let etaSum = "00:00:00"
  let queue = [rootStep]

  while (queue.length > 0) {
    const newBlockingStepsArray: Step[] = []

    queue.forEach((step) => {
      if (step.time_needed) {
        etaSum = addTime(etaSum, step.time_needed)
      }
      if (step.child_step_ids) {
        fillConnectedChildSteps(
          step.child_step_ids,
          connectedStepList,
          stepDict,
        )
        step.child_step_ids.forEach((id) => {
          const childStep = stepDict[id]
          if (childStep?.time_needed) {
            etaSum = addTime(etaSum, childStep.time_needed)
          }
        })
      }

      const isParallelBlockingLevel = (step.blocking_step_ids || []).length > 1

      if (isParallelBlockingLevel) {
        componentList.push({
          level: componentList.length,
          marginLeft: offSet,
          serialComponents: [...serialSteps],
          className: "flex",
        })
        offSet += Math.floor(serialSteps.length / 2 + 1) * 520
        serialSteps = []
      }

      const blockingSteps = step.blocking_step_ids || []
      blockingSteps.forEach((blockingStepId) => {
        const blockingStep = stepDict[blockingStepId] || defaultStep

        if (!traversedArray.includes(blockingStepId)) {
          stepNumber++
          traversedArray.push(blockingStepId)
          doneCount += blockingStep.status === "DONE" ? 1 : 0

          serialSteps.push({
            type: "Step",
            data: {
              step: blockingStep,
              stepNumber,
              isRootStep: false,
              isLastStep: blockingStepId === flow.last_step_id,
              isConnectedStep: true,
            },
          })

          connectedStepList.push(blockingStep.id)
          newBlockingStepsArray.push(blockingStep)
        }
      })

      if (isParallelBlockingLevel) {
        componentList.push({
          level: componentList.length,
          marginLeft: offSet - 180,
          serialComponents: [...serialSteps],
          className: "flex flex-col justify-center",
        })
        offSet += 520 - 180
        serialSteps = []
        return
      }
    })

    queue = newBlockingStepsArray
  }

  componentList.push({
    level: componentList.length,
    marginLeft: offSet,
    serialComponents: [...serialSteps],
    className: "flex flex-row gap-[146px]",
  })

  return [componentList, stepNumber, doneCount, etaSum]
}

export function getComponentList(flow: Flow) {
  const stepDict: Record<string, Step> = {}
  if (flow?.steps) {
    flow.steps.forEach((step) => {
      stepDict[step.id] = {
        id: step.id,
        type: step.type,
        blocked_by_step_ids: step.blocked_by_step_ids,
        blocking_step_ids: step.blocking_step_ids,
        parent_step_id: step.parent_step_id,
        child_step_ids: step.child_step_ids,
        status: step.status,
        assignee_id: step.assignee_id,
        template_step_id: step.template_step_id,
        unblocked_at: step.unblocked_at,
        completed_by: step.completed_by,
        contents: step.contents,
        fall_back_step_id: step.fall_back_step_id,
        time_needed: step.time_needed,
        name: step.name,
        position: step.position,
      }
    })
  }
  const [componentList] = flowBFS(stepDict, flow)
  return componentList
}