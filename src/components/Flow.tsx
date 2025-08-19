import { useState, useContext, useEffect, useRef } from "react"
import { UserDetail } from './AuthWrapper';
import { FlowContext, Status, Step, Flow, Content } from "../context/FlowProvider"
import { fetchContentUrl, changeStepStatusUrl } from "../api/ApiEndpoints"
import { CircularProgress } from "./CircularProgress";

export interface FlowProps {
  title?: string;
  steps?: string[];
  onComplete?: () => void;
  className?: string;
  user?: UserDetail;
}

export interface StepGeneratorData {
  step: Step
  stepNumber: number
  isRootStep: boolean
  isLastStep: boolean
  isConnectedStep: boolean
}

export type SerialComponents = { type: "Step"; data: StepGeneratorData }

export interface ComponentListData {
  level: number
  marginLeft: number
  serialComponents: SerialComponents[]
  className: string
}

export interface FlowBFSResult {
  componentList: ComponentListData[]
  stepNumber: number
  doneCount: number
  etaSum: string
}

type ChangeStepStatusObject = {
  id: string
  status: Status
}

type ChangeStepStatusResponse = {
  steps: ChangeStepStatusObject[]
  latest_version: string
}

function padWithZero(value: number): string {
  if (value < 10) {
    return "0" + value.toString()
  } else {
    return value.toString()
  }
}

function parseTime(time: string): [number, number, number] {
  const regex = /^([0-9]+):([0-5][0-9]):([0-5][0-9])$/
  const result = regex.exec(time)

  const getRegexRes = (
    regexResult: RegExpExecArray | null,
    index: number,
  ): number | undefined => {
    if (!regexResult || !regexResult[index]) {
      return undefined
    }
    const parsed = parseInt(regexResult[index], 10)
    return isNaN(parsed) ? undefined : parsed
  }

  if (result) {
    const hour = getRegexRes(result, 1)
    const min = getRegexRes(result, 2)
    const sec = getRegexRes(result, 3)

    if (hour !== undefined && min !== undefined && sec !== undefined) {
      return [hour, min, sec]
    }
  }

  return [0, 0, 0]
}

export function isExecutable(status: Status): boolean {
  return status === "PENDING" || status === "INCOMPLETE" || status === "OVERDUE"
}

function customCompare(a: number | undefined, b: number | undefined): number {
  if (a === undefined && b === undefined) return 0
  if (a === undefined) return 1
  if (b === undefined) return -1
  return a - b
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

export function addTime(tB: string, tA: string): string {
  const matchA = parseTime(tA)
  const matchB = parseTime(tB)

  const hrSum = matchA[0] + matchB[0]
  const minSum = matchA[1] + matchB[1]
  const secSum = matchA[2] + matchB[2]

  let carry = 0
  const totalSec = secSum % 60
  carry = Math.floor(secSum / 60)

  const totalMin = (minSum + carry) % 60
  carry = Math.floor((minSum + carry) / 60)

  const totalHr = hrSum + carry

  return (
    padWithZero(totalHr) +
    ":" +
    padWithZero(totalMin) +
    ":" +
    padWithZero(totalSec)
  )
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

const defaultStep: Step = {
  id: "",
  type: "DEFAULT",
  blocked_by_step_ids: undefined,
  blocking_step_ids: undefined,
  parent_step_id: undefined,
  child_step_ids: undefined,
  status: "NOTHING",
  template_step_id: undefined,
  assignee_id: undefined,
  unblocked_at: undefined,
  completed_by: undefined,
  contents: [],
  fall_back_step_id: undefined,
  time_needed: undefined,
  name: undefined,
  position: undefined,
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

export function getDefaultFlow(): Flow {
  const rootStepId = "root-step-1";
  const setupStepId = "setup-step-1";
  const configStepId = "config-step-1";
  const testingStepId = "testing-step-1";
  const lastStepId = "deployment-step-1";
  
  // Child steps
  const setupSubStep1 = "setup-substep-1";
  const setupSubStep2 = "setup-substep-2";
  const configSubStep1 = "config-substep-1";
  const configSubStep2 = "config-substep-2";
  const testingSubStep1 = "testing-substep-1";
  const deploymentSubStep1 = "deployment-substep-1";

  const defaultSteps: Step[] = [
    // Root step
    {
      id: rootStepId,
      type: "ROOT",
      status: "DONE",
      blocking_step_ids: [setupStepId],
      contents: [
        {
          id: "content-root-1",
          template_scope_id: "root-template",
          display: "Getting Started",
          content_type: "PRIMARY_TEXT"
        },
        {
          id: "content-root-2",
          template_scope_id: "root-template",
          display: "Welcome to the BBPS integration process. This guide will walk you through setting up your integration step by step.",
          content_type: "SECONDARY_TEXT"
        }
      ],
      name: "Getting Started",
      position: 1,
      time_needed: "00:05:00"
    },
    // Setup step
    {
      id: setupStepId,
      type: "MAIN",
      status: "PENDING",
      blocked_by_step_ids: [rootStepId],
      blocking_step_ids: [configStepId],
      child_step_ids: [setupSubStep1, setupSubStep2],
      contents: [
        {
          id: "content-setup-1",
          template_scope_id: "setup-template",
          display: "Environment Setup",
          content_type: "PRIMARY_TEXT"
        }
      ],
      name: "Environment Setup",
      position: 2,
      time_needed: "00:15:00"
    },
    // Setup substeps
    {
      id: setupSubStep1,
      type: "SUB",
      status: "PENDING",
      parent_step_id: setupStepId,
      contents: [
        {
          id: "content-setup-sub1-1",
          template_scope_id: "setup-sub-template",
          display: "Install Dependencies",
          content_type: "PRIMARY_TEXT"
        },
        {
          id: "content-setup-sub1-2",
          template_scope_id: "setup-sub-template",
          display: "Install the required packages and dependencies for your BBPS integration. Run <code>npm install</code> to get started.",
          content_type: "SECONDARY_TEXT"
        }
      ],
      name: "Install Dependencies",
      position: 1,
      time_needed: "00:05:00"
    },
    {
      id: setupSubStep2,
      type: "SUB",
      status: "PENDING",
      parent_step_id: setupStepId,
      contents: [
        {
          id: "content-setup-sub2-1",
          template_scope_id: "setup-sub-template",
          display: "Configure Environment Variables",
          content_type: "PRIMARY_TEXT"
        },
        {
          id: "content-setup-sub2-2",
          template_scope_id: "setup-sub-template",
          display: "Set up your environment variables including API keys, endpoints, and merchant configuration details.",
          content_type: "SECONDARY_TEXT"
        }
      ],
      name: "Configure Environment Variables",
      position: 2,
      time_needed: "00:10:00"
    },
    // Configuration step
    {
      id: configStepId,
      type: "MAIN",
      status: "UPCOMING",
      blocked_by_step_ids: [setupStepId],
      blocking_step_ids: [testingStepId],
      child_step_ids: [configSubStep1, configSubStep2],
      contents: [
        {
          id: "content-config-1",
          template_scope_id: "config-template",
          display: "API Configuration",
          content_type: "PRIMARY_TEXT"
        }
      ],
      name: "API Configuration",
      position: 3,
      time_needed: "00:20:00"
    },
    // Config substeps
    {
      id: configSubStep1,
      type: "SUB",
      status: "UPCOMING",
      parent_step_id: configStepId,
      contents: [
        {
          id: "content-config-sub1-1",
          template_scope_id: "config-sub-template",
          display: "Set up BBPS API Endpoints",
          content_type: "PRIMARY_TEXT"
        },
        {
          id: "content-config-sub1-2",
          template_scope_id: "config-sub-template",
          display: "Configure the BBPS API endpoints and authentication settings in your application.",
          content_type: "SECONDARY_TEXT"
        }
      ],
      name: "Set up BBPS API Endpoints",
      position: 1,
      time_needed: "00:10:00"
    },
    {
      id: configSubStep2,
      type: "SUB",
      status: "UPCOMING",
      parent_step_id: configStepId,
      contents: [
        {
          id: "content-config-sub2-1",
          template_scope_id: "config-sub-template",
          display: "Configure Merchant Settings",
          content_type: "PRIMARY_TEXT"
        },
        {
          id: "content-config-sub2-2",
          template_scope_id: "config-sub-template",
          display: "Set up merchant-specific configurations including payment categories and billing settings.",
          content_type: "SECONDARY_TEXT"
        }
      ],
      name: "Configure Merchant Settings",
      position: 2,
      time_needed: "00:10:00"
    },
    // Testing step
    {
      id: testingStepId,
      type: "MAIN",
      status: "UPCOMING",
      blocked_by_step_ids: [configStepId],
      blocking_step_ids: [lastStepId],
      child_step_ids: [testingSubStep1],
      contents: [
        {
          id: "content-testing-1",
          template_scope_id: "testing-template",
          display: "Testing & Validation",
          content_type: "PRIMARY_TEXT"
        }
      ],
      name: "Testing & Validation",
      position: 4,
      time_needed: "00:25:00"
    },
    // Testing substep
    {
      id: testingSubStep1,
      type: "SUB",
      status: "UPCOMING",
      parent_step_id: testingStepId,
      contents: [
        {
          id: "content-testing-sub1-1",
          template_scope_id: "testing-sub-template",
          display: "Run Integration Tests",
          content_type: "PRIMARY_TEXT"
        },
        {
          id: "content-testing-sub1-2",
          template_scope_id: "testing-sub-template",
          display: "Execute comprehensive tests to validate your BBPS integration including payment processing and status updates.",
          content_type: "SECONDARY_TEXT"
        }
      ],
      name: "Run Integration Tests",
      position: 1,
      time_needed: "00:25:00"
    },
    // Deployment step
    {
      id: lastStepId,
      type: "MAIN",
      status: "UPCOMING",
      blocked_by_step_ids: [testingStepId],
      child_step_ids: [deploymentSubStep1],
      contents: [
        {
          id: "content-deployment-1",
          template_scope_id: "deployment-template",
          display: "Go Live",
          content_type: "PRIMARY_TEXT"
        }
      ],
      name: "Go Live",
      position: 5,
      time_needed: "00:10:00"
    },
    // Deployment substep
    {
      id: deploymentSubStep1,
      type: "SUB",
      status: "UPCOMING",
      parent_step_id: lastStepId,
      contents: [
        {
          id: "content-deployment-sub1-1",
          template_scope_id: "deployment-sub-template",
          display: "Deploy to Production",
          content_type: "PRIMARY_TEXT"
        },
        {
          id: "content-deployment-sub1-2",
          template_scope_id: "deployment-sub-template",
          display: "Deploy your BBPS integration to production and monitor the initial transactions.",
          content_type: "SECONDARY_TEXT"
        }
      ],
      name: "Deploy to Production",
      position: 1,
      time_needed: "00:10:00"
    }
  ];

  return {
    id: "default-flow-1",
    merchant_id: "default-merchant",
    flow_id: "bbps-integration-flow",
    scenario: "bbps-onboarding",
    root_step_id: rootStepId,
    last_step_id: lastStepId,
    product_info_id: "bbps-product-info",
    steps: defaultSteps
  };
}

const MakeFlow: React.FC<FlowProps> = ({
  title = "Welcome to Flow",
  steps = ["Step 1", "Step 2", "Step 3"],
  onComplete,
  className = "",
  user
}) => {
  // Dummy/hardcoded values for missing variables
  const navigate = (options: any) => {
    console.log('Navigate called with:', options);
  };
  const chatId = "dummy-chat-id";
  const project = { name: "BBPS" };
  const getProjectScenario = (projectName?: string) => {
    switch (projectName) {
      case "BBPS":
        return "bbps-onboarding";
      case "NEXUS":
        return "nexus-integration";
      case "DPIP":
        return "dpip-setup";
      default:
        return "default-scenario";
    }
  };
  const fetchChatExternalId = (stepId: string, userId: string, navigate: any, chatId: string, stepData: any) => {
    console.log('fetchChatExternalId called with:', { stepId, userId, chatId, stepData });
  };
  
  // Simple OnboardingChatBox placeholder
  const OnboardingChatBox = ({ role, user, initialChatId, onStepStatusUpdate, scrollContainerRef }: any) => (
    <div className="p-4 bg-gray-100 rounded-lg">
      <div className="text-sm text-gray-600 mb-2">Chat Box Placeholder</div>
      <div className="text-xs text-gray-500">Role: {role || 'Unknown'}</div>
      <div className="text-xs text-gray-500">Chat ID: {initialChatId || 'None'}</div>
    </div>
  );

  const { flow, activeSubStep, setFlow, setActiveSubStep } =
    useContext(FlowContext)
  console.log('Flow:', flow);
  const [_, setChangeStepStatusError] = useState("")
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>(
    {},
  )
  const [componentList, setComponentList] = useState<ComponentListData[]>([])
  const [welcomeMessage, setWelcomeMessage] = useState<string>("")
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false)
  const scrollFlowRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // // Initialize flow, componentList and activeSubStep on first render
  // useEffect(() => {
  //   // Initialize default flow if none exists
  //   if (!flow) {
  //     const defaultFlow = getDefaultFlow()
  //     setFlow(defaultFlow)
  //     return
  //   }
    
  //   const updatedComponentList = getComponentList(flow)
  //   setComponentList(updatedComponentList)
    
  //   // Set activeSubStep to first executable step if not already set
  //   if (!activeSubStep) {
  //     const stepDict: Record<string, Step> = {}
  //     flow.steps.forEach((step) => {
  //       stepDict[step.id] = step
  //     })
      
  //     const stepPropsArray: StepGeneratorData[] = updatedComponentList
  //       .flatMap((componentData) => componentData.serialComponents)
  //       .map((serialComponent) => serialComponent.data)
      
  //     const firstActiveSubstep = getFirstActiveSubStepInfo(
  //       stepPropsArray,
  //       stepDict,
  //     )
      
  //     if (firstActiveSubstep) {
  //       setActiveSubStep(firstActiveSubstep)
        
  //       // Expand parent step
  //       const parentStep = flow.steps.find((step) =>
  //         step.child_step_ids?.includes(firstActiveSubstep.id),
  //       )
  //       if (parentStep) {
  //         setExpandedSteps((prev) => ({
  //           ...prev,
  //           [parentStep.id]: true,
  //         }))
  //       }
  //     }
  //   }
  // }, [flow, setFlow, setActiveSubStep, activeSubStep])
  // useEffect(() => {
  //   if (scrollFlowRef?.current) {
  //     scrollFlowRef.current.scrollTop = scrollFlowRef.current.scrollHeight
  //   }
  // }, [scrollFlowRef, activeSubStep])

  const calculateFlowProgress = () => {
    if (!flow?.steps || flow.steps.length === 0) return 0
    const completedSteps = flow.steps.filter(
      (step) => step.status === "DONE",
    ).length
    return Math.round((completedSteps / flow.steps.length) * 100)
  }

  const calculateStepSubstepProgress = (step: Step) => {
    if (!step?.child_step_ids || step.child_step_ids.length == 0) return 0
    const childSteps = flow?.steps.filter((st) =>
      step.child_step_ids?.includes(st.id),
    )
    const completedSteps = childSteps?.filter(
      (step) => step.status === "DONE",
    ).length
    return Math.round((completedSteps! / childSteps!.length) * 100)
  }

  const changeStepStatus = async (
    flowId: string,
    stepId: string,
    status: Status,
  ): Promise<boolean> => {
    setChangeStepStatusError("")
    try {
      if (!user?.email) {
        throw new Error("email required")
      }
      //Logic for completing all LastSubsteps (fix turing-core)
      const secondLastStepId = componentList[0]?.serialComponents.find(
        (serialComponent) =>
          serialComponent.data.step.id === flow?.last_step_id,
      )?.data.step.blocked_by_step_ids?.[0]
      const secondLastStep = flow?.steps.find(
        (step) => step.id === secondLastStepId,
      )
      const secondLastStepSubstepId =
        secondLastStep?.child_step_ids?.[
          secondLastStep.child_step_ids.length - 1
        ]
      const isSecondLastStepsLastSubStep = stepId === secondLastStepSubstepId

      const lastStep = flow?.steps.find(
        (step) => step.id === flow?.last_step_id,
      )
      const lastStepSubstepIds = lastStep?.child_step_ids || []

      // Fetch fresh project-specific flow data to ensure we use the correct flow_id
      let currentFlowId = flowId
      try {
        const projectMerchantMap: Record<string, string> = {
          DPIP: "dpip",
          NEXUS: "nexus",
          BBPS: "bbps",
        }

        const merchantId = projectMerchantMap[project?.name || "BBPS"]
        if (merchantId) {
          console.log(
            `Fetching fresh flow_id for project ${project?.name} (merchant: ${merchantId})`,
          )

          // Get content endpoint first
          const contentResponse = await fetch(fetchContentUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "xyne-token": "f0ea103ce0343188f96ee8457e10ba",
            },
            body: JSON.stringify({
              id: "93177e1f-4685-4bb8-bb1a-972b87d4f179",
            }),
          })

          if (contentResponse.ok) {
            const contentData = await contentResponse.json()
            const flowEndpoint = `${contentData[0].display}/merchant/flow/fetch`

            // Fetch fresh flow data
            const flowResponse = await fetch(flowEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "xyne-token": "f0ea103ce0343188f96ee8457e10ba",
              },
              body: JSON.stringify({
                merchant_id: merchantId,
                product_name: "PP",
                merchant_type: "F1",
                scenario: getProjectScenario(project?.name),
              }),
            })

            if (flowResponse.ok) {
              const freshFlowData = await flowResponse.json()
              if (freshFlowData?.flow_id) {
                currentFlowId = freshFlowData.flow_id
                console.log(
                  `Using fresh flow_id for ${project?.name}: ${currentFlowId} (was: ${flowId})`,
                )
              }
            }
          }
        }
      } catch (error) {
        console.warn(
          `Failed to fetch fresh flow_id, using provided flowId: ${flowId}`,
          error,
        )
      }

      const request: ChangeStepStatusObject = {
        id: stepId,
        status: status,
      }
      const requestLastStepSubsteps: ChangeStepStatusObject[] =
        lastStepSubstepIds.map((substepId) => ({
          id: substepId,
          status: status,
        }))

      const requestBody = {
        request_array: isSecondLastStepsLastSubStep
          ? [request].concat(requestLastStepSubsteps)
          : [request],
        flow_id: currentFlowId, // Use fresh flow_id instead of potentially stale one
      }

      const contentFetchResponse = await fetch(fetchContentUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xyne-token": "f0ea103ce0343188f96ee8457e10ba",
        },
        body: JSON.stringify({
          id: "93177e1f-4685-4bb8-bb1a-972b87d4f179",
        }),
      })

      if (!contentFetchResponse.ok) {
        throw new Error(`Flow fetch failed: ${contentFetchResponse.status}`)
      }

      const contentData: Content[] = await contentFetchResponse.json()

      const changeStepStatusResponse = await fetch(
        changeStepStatusUrl(contentData[0].display),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xyne-token": "f0ea103ce0343188f96ee8457e10ba",
          },
          body: JSON.stringify(requestBody),
        },
      )

      if (changeStepStatusResponse.ok) {
        const data: ChangeStepStatusResponse =
          await changeStepStatusResponse.json()

        if (flow) {
          const updatedSteps = flow.steps.map((step) => {
            const updatedStep = data.steps.find(
              (responseStep) => responseStep.id === step.id,
            )
            return updatedStep ? { ...step, status: updatedStep.status } : step
          })

          const updatedFlow = { ...flow, steps: updatedSteps }
          setFlow(updatedFlow)

          const updatedComponentList = getComponentList(updatedFlow)
          setComponentList(updatedComponentList)

          const stepDict: Record<string, Step> = {}
          updatedSteps.forEach((step) => {
            stepDict[step.id] = step
          })

          const stepPropsArray: StepGeneratorData[] = updatedComponentList
            .flatMap((componentData) => componentData.serialComponents)
            .map((serialComponent) => serialComponent.data)

          const firstActiveSubstep = getFirstActiveSubStepInfo(
            stepPropsArray,
            stepDict,
          )

          setActiveSubStep(firstActiveSubstep || null)

          // Fetch chat external_id when activeSubStep changes
          if (firstActiveSubstep?.id && user?.id) {
            fetchChatExternalId(
              firstActiveSubstep.id,
              user.id,
              navigate,
              chatId,
              {
                name: firstActiveSubstep.name,
                contents: firstActiveSubstep.contents,
              },
            )
          }
          if (firstActiveSubstep) {
            const parentStep = flow.steps.find((step) =>
              step.child_step_ids?.includes(firstActiveSubstep.id),
            )
            if (parentStep) {
              setExpandedSteps((prev) => ({
                ...prev,
                [parentStep.id]: true,
              }))
            }
          }
        }
        return true
      }
      throw new Error(
        `Change Step status failed with status: ${changeStepStatusResponse.status}`,
      )
    } catch (err: any) {
      setChangeStepStatusError(err.message || "Failed to change step status")
      return false
    }
  }
  // useEffect(() => {
  //   const componentList = getComponentList(flow)

  //   const firstActiveChildStep: Step | undefined = (() => {
  //     for (const component of componentList) {
  //       for (const serialComponent of component.serialComponents) {
  //         const step = serialComponent.data.step
  //         if (step.child_step_ids) {
  //           const childStep = step.child_step_ids
  //             .map((id) => flow?.steps.find((s) => s.id === id))
  //             .filter(Boolean)
  //             .find((childStep) => childStep?.status === "PENDING")
  //           if (childStep) {
  //             return childStep
  //           }
  //         }
  //       }
  //     }
  //     return undefined
  //   })()

  //   // Set the active substep if we found one and there isn't already one set
  //   if (firstActiveChildStep && !activeSubStep) {
  //     console.log("Flow useEffect: setting activeSubStep", firstActiveChildStep);
  //     setActiveSubStep(firstActiveChildStep)
  //   }

  //   // Fetch chat external_id when activeSubStep changes
  //   if (firstActiveChildStep?.id && user?.id) {
  //     fetchChatExternalId(firstActiveChildStep.id, user.id, navigate, chatId, {
  //       name: firstActiveChildStep.name,
  //       contents: firstActiveChildStep.contents,
  //     })
  //   }

  //   if (firstActiveChildStep) {
  //     const parentStep = flow?.steps.find((step) =>
  //       step.child_step_ids?.includes(firstActiveChildStep.id),
  //     )
  //     if (parentStep) {
  //       setExpandedSteps((prev) => ({
  //         ...prev,
  //         [parentStep.id]: true,
  //       }))
  //     }
  //   }
  // }, [flow, activeSubStep, setActiveSubStep, user?.id, navigate, chatId])

  // Add a new useEffect to handle URL updates when activeSubstep changes
  // useEffect(() => {
  //   if (activeSubStep?.id && user?.id) {
  //     fetchChatExternalId(activeSubStep.id, user.id, navigate, chatId, {
  //       name: activeSubStep.name,
  //       contents: activeSubStep.contents,
  //     })
  //   }
  // }, [activeSubStep?.id, user?.id, navigate, chatId])

  // // Fetch welcome message when activeSubStep changes
  // useEffect(() => {
  //   const fetchWelcomeMessage = async () => {
  //     if (!activeSubStep) {
  //       setWelcomeMessage("")
  //       return
  //     }

  //     const primaryText =
  //       activeSubStep.contents?.find((c) => c.content_type === "PRIMARY_TEXT")
  //         ?.display || ""

  //     if (!primaryText) {
  //       setWelcomeMessage("")
  //       return
  //     }

  //     try {
  //       const response = await fetch(
  //         `/api/v1/chat/welcome-message?primaryText=${encodeURIComponent(primaryText)}`,
  //       )
  //       if (response.ok) {
  //         const data = await response.json()
  //         setWelcomeMessage(data.welcomeMessage || "")
  //       } else {
  //         setWelcomeMessage("")
  //       }
  //     } catch (error) {
  //       console.error("Failed to fetch welcome message:", error)
  //       setWelcomeMessage("")
  //     }
  //   }

  //   fetchWelcomeMessage()
  // }, [activeSubStep])

  // Handle escape key to close preview modal
  // useEffect(() => {
  //   const handleKeyDown = (event: KeyboardEvent) => {
  //     if (event.key === "Escape" && isPreviewOpen) {
  //       setIsPreviewOpen(false)
  //     }
  //   }

  //   if (isPreviewOpen) {
  //     document.addEventListener("keydown", handleKeyDown)
  //     // Prevent body scroll when modal is open
  //     document.body.style.overflow = "hidden"
  //   } else {
  //     document.body.style.overflow = "unset"
  //   }

  //   return () => {
  //     document.removeEventListener("keydown", handleKeyDown)
  //     document.body.style.overflow = "unset"
  //   }
  // }, [isPreviewOpen])

  const firstRootChildStep: Step | undefined = flow?.steps.find(
    (s) =>
      s.id ===
      componentList[0]?.serialComponents[0]?.data.step.child_step_ids?.[0],
  )

  const primaryText =
    activeSubStep?.contents?.find((c) => c.content_type === "PRIMARY_TEXT")
      ?.display || ""

  const secondaryText = (() => {
    const rawText =
      activeSubStep?.contents?.find((c) => c.content_type === "SECONDARY_TEXT")
        ?.display || ""

    return rawText.trim()
  })()
  console.log("flowoww",flow,componentList,activeSubStep)
  return (
    <div
      id="flow-screen"
      className="w-screen h-screen flex flex-col lg:flex-row justify-center bg-white overflow-hidden"
    >
      <div
        ref={scrollFlowRef}
        className="lg:w-[32%] h-full flex flex-col overflow-y-auto"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 flex flex-col gap-6 z-[10]">
          <svg
            className="cursor-pointer"
            onClick={() => navigate({ to: "/home" })}
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 19L5 12M5 12L12 5M5 12H19"
              stroke="#464D53"
              stroke-width="2.25"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <div className="justify-center text-neutral-600 text-base font-semibold">
            {project?.name || "BBPS"} Integration
          </div>
          <div className="self-stretch h-10 py-4 px-4 pr-3 rounded-lg border border-zinc-200 flex items-center justify-start gap-14">
            <div className="flex-1 p-0.5 bg-slate-100 overflow-hidden rounded-full flex flex-col justify-center items-start gap-2.5">
              <div
                className="h-2 bg-slate-600 rounded-full"
                style={{ width: `${calculateFlowProgress()}%` }}
              ></div>
            </div>
            <div className="w-10 flex justify-end items-end gap-0.5">
              <div className="flex items-center justify-center text-slate-600 text-base font-mono font-extrabold gap-1">
                {calculateFlowProgress()}{" "}
                <div className="text-slate-400 text-xs font-semibold">%</div>
              </div>
            </div>
          </div>
        </div>
        {/* Step Section */}
        <div className="w-full h-full">
          {componentList[0]?.serialComponents &&
          componentList[0]?.serialComponents.length > 0 ? (
            <div className="w-full px-4 lg:px-6 bg-white">
              <div className="space-y-3">
                {componentList[0].serialComponents.map((serialComponent) => {
                  const barHeight =
                    serialComponent.data.isLastStep &&
                    !expandedSteps[flow?.last_step_id || ""]
                      ? ""
                      : "calc(100%)"
                  const stepId = serialComponent.data.step.id
                  const isStepExpanded = expandedSteps[stepId] || false
                  const toggleStepExpansion = () => {
                    setExpandedSteps((prev) => ({
                      ...prev,
                      [stepId]: !prev[stepId],
                    }))
                  }
                  const stepPrimaryText =
                    serialComponent.data.step.contents?.find(
                      (c) => c.content_type === "PRIMARY_TEXT",
                    )?.display || ""
                  return (
                    <div
                      key={serialComponent.data.step.id}
                      className="relative px-6 py-6 bg-white dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex gap-4 items-center">
                        <div
                          id="vertical-bar"
                          style={{ height: barHeight }}
                          className="absolute w-[1px] top-[30px] left-[15.5px] flex flex-col flex-1 bg-[rgba(217,217,217,1)] z-[0] mt-6 ml-[15px]"
                        />
                        {serialComponent.data.step.status == "DONE" ? (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8ZM2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8Z"
                              fill="#D6E0EA"
                            />
                            <circle cx="8" cy="8" r="8" fill="#464D53" />
                            <path
                              d="M10.2205 6L7.15444 8.84444L5.85776 7.46067L5 8.26444L7.09484 10.5L11.0177 6.8641L10.2205 6Z"
                              fill="white"
                            />
                          </svg>
                        ) : (
                          <CircularProgress
                            progress={calculateStepSubstepProgress(
                              serialComponent.data.step,
                            )}
                          />
                        )}
                        <div
                          onClick={toggleStepExpansion}
                          className="cursor-pointer justify-center text-neutral-600 text-sm font-bold font-['JetBrains_Mono'] uppercase"
                        >
                          {stepPrimaryText}
                        </div>
                        {isStepExpanded ? (
                          <svg
                            onClick={toggleStepExpansion}
                            className="cursor-pointer"
                            width="8"
                            height="6"
                            viewBox="0 0 8 6"
                            fill="none"
                          >
                            <path
                              d="M1 4.5L4 1.5L7 4.5"
                              stroke="#848DA1"
                              stroke-width="1.5"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                          </svg>
                        ) : (
                          <svg
                            onClick={toggleStepExpansion}
                            className="cursor-pointer"
                            width="8"
                            height="6"
                            viewBox="0 0 8 6"
                            fill="none"
                          >
                            <path
                              d="M7 1.5L4 4.5L1 1.5"
                              stroke="#848DA1"
                              stroke-width="1.5"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <div
                        className={`overflow-hidden transition-all duration-100 ease-in-out ${
                          isStepExpanded
                            ? "max-h-[1000px] h-fit opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div
                          className={`pt-6 inline-flex flex-col justify-start items-start gap-4 transform transition-all duration-300 ease-in-out ${
                            isStepExpanded ? "translate-y-0" : "-translate-y-4"
                          }`}
                        >
                          {serialComponent.data.step.child_step_ids?.map(
                            (childStepId) => {
                              const childStep = flow?.steps.find(
                                (s) => s.id === childStepId,
                              )
                              const primaryText =
                                childStep?.contents?.find(
                                  (c) => c.content_type === "PRIMARY_TEXT",
                                )?.display || ""
                              const isLastChildStepOfParent =
                                childStep?.id ==
                                serialComponent.data.step.child_step_ids?.[
                                  serialComponent.data.step.child_step_ids
                                    ?.length - 1
                                ]
                              return (
                                <div
                                  onClick={() => {
                                    setActiveSubStep(childStep || null)
                                    // Fetch chat external_id when activeSubStep changes
                                    if (childStep?.id && user?.id) {
                                      fetchChatExternalId(
                                        childStep.id,
                                        user.id,
                                        navigate,
                                        chatId,
                                        {
                                          name: childStep.name,
                                          contents: childStep.contents,
                                        },
                                      )
                                    }
                                  }}
                                  key={childStepId}
                                  className={`cursor-pointer flex w-[357px] justify-start items-center gap-2 ml-8 transition-all duration-200 ease-in-out hover:bg-gray-50 rounded p-2 -m-2 ${childStep?.id == activeSubStep?.id ? "bg-[#F1F4F9]" : ""} ${isLastChildStepOfParent ? "mb-2" : ""}`}
                                >
                                  <div className="h-5 flex justify-center items-center gap-2.5">
                                    {childStep?.status == "DONE" ? (
                                      <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 12 12"
                                        fill="none"
                                      >
                                        <path
                                          d="M10.4104 1.52344L4.2962 7.19559L1.71048 4.43619L0 6.039L4.17737 10.497L12 3.24655L10.4104 1.52344Z"
                                          fill="#12B76A"
                                        />
                                      </svg>
                                    ) : (
                                      <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 12 12"
                                        fill="none"
                                      >
                                        <rect
                                          y="5.01025"
                                          width="12"
                                          height="2"
                                          rx="1"
                                          fill="#464D53"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                  <div
                                    className={`not-italic justify-start text-sm leading-tight tracking-tight font-medium text-[#464D53]`}
                                  >
                                    {primaryText}
                                  </div>
                                </div>
                              )
                            },
                          )}
                        </div>
                      </div>
                      {!isStepExpanded && (
                        <div className="mt-1 ml-8 self-stretch justify-center text-gray-400 text-sm font-normal transition-all duration-200 ease-in-out">
                          {serialComponent.data.step.child_step_ids?.length}{" "}
                          tasks to be completed
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {/* Vertical Bar */}
      <div className="w-px h-[100%] bg-zinc-200" />
      {/* Right Side View */}
      <div className="relative w-full lg:w-[68%] h-full lg:h-screen flex flex-col bg-white dark:bg-[#1E1E1E]">
        {/* Scrollable Content Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-40">
          {/* Preview Doc Link feature */}

          {/* Active Substep Provider */}
          <div className="w-[768px] my-10 mr-[88px] ml-[185px] p-8 bg-slate-50 rounded-2xl flex flex-col gap-2 overflow-hidden">
            <div className="flex items-start gap-6">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="16" fill="#FFE6E6" />
                <path
                  d="M18.3333 20.3894C18.4188 20.833 18.5299 21.1402 18.6667 21.3108C18.8034 21.4814 18.9829 21.5667 19.2051 21.5667C19.4273 21.5667 19.6496 21.4388 19.8718 21.1828C20.1111 20.9098 20.3761 20.3382 20.6667 19.468L21 18.521H21.4872L20.8462 20.3894C20.6068 21.1402 20.2735 21.7032 19.8462 22.0786C19.4188 22.454 18.9573 22.7014 18.4615 22.8208C17.9658 22.9403 17.4957 23 17.0513 23C16.1624 23 15.4103 22.8208 14.7949 22.4625C14.1966 22.0871 13.8462 21.3961 13.7436 20.3894L12.7179 11.6106C12.6496 11.167 12.5299 10.894 12.359 10.7916C12.2051 10.6722 12.0171 10.6124 11.7949 10.6124C11.6581 10.6124 11.5128 10.6551 11.359 10.7404C11.2222 10.8087 11.0769 10.9793 10.9231 11.2523C10.7692 11.5253 10.5897 11.9519 10.3846 12.532L10.0513 13.479H9.5641L10.2051 11.6106C10.4444 10.8598 10.7778 10.2968 11.2051 9.92139C11.6325 9.54601 12.1026 9.2986 12.6154 9.17916C13.1453 9.05972 13.6496 9 14.1282 9C15.0684 9 15.812 9.19622 16.359 9.58867C16.9231 9.98111 17.265 10.7745 17.3846 11.9689L18.3333 20.3894ZM18.9744 10.9707C18.6154 11.4485 18.2991 11.9775 18.0256 12.5576C17.7521 13.1377 17.5128 13.7179 17.3077 14.298C17.1197 14.8781 16.9573 15.4071 16.8205 15.8848C16.8205 15.8848 16.735 15.8848 16.5641 15.8848C16.3932 15.8678 16.3077 15.8592 16.3077 15.8592C16.3419 15.7227 16.4103 15.4668 16.5128 15.0914C16.6325 14.699 16.7863 14.2468 16.9744 13.7349C17.1795 13.206 17.4188 12.6685 17.6923 12.1225C17.9829 11.5594 18.2991 11.039 18.641 10.5612C19.1026 9.92992 19.5897 9.51188 20.1026 9.30713C20.6325 9.10238 21.1368 9 21.6154 9C22.3162 9 22.8889 9.18769 23.3333 9.56307C23.7778 9.93845 24 10.4759 24 11.1755C24 11.841 23.7863 12.387 23.359 12.8135C22.9316 13.2401 22.3761 13.4534 21.6923 13.4534C21.1624 13.4534 20.6325 13.2742 20.1026 12.9159C19.5897 12.5576 19.2137 11.9092 18.9744 10.9707ZM12.0256 21.0293C12.5726 20.2956 13.0171 19.4765 13.359 18.5722C13.7179 17.6508 13.9915 16.8318 14.1795 16.1152C14.1795 16.1152 14.265 16.1237 14.4359 16.1408C14.6068 16.1408 14.6923 16.1408 14.6923 16.1408C14.5726 16.6185 14.4017 17.1731 14.1795 17.8044C13.9573 18.4357 13.6923 19.0756 13.3846 19.7239C13.094 20.3553 12.7521 20.9269 12.359 21.4388C11.8803 22.053 11.3761 22.4625 10.8462 22.6673C10.3333 22.8891 9.83761 23 9.35897 23C8.62393 23 8.05128 22.8208 7.64103 22.4625C7.21368 22.0871 7 21.5838 7 20.9525C7 20.2017 7.23932 19.613 7.71795 19.1865C8.17949 18.7599 8.7265 18.5466 9.35897 18.5466C10.0427 18.5466 10.5983 18.777 11.0256 19.2377C11.4701 19.6813 11.8034 20.2785 12.0256 21.0293Z"
                  fill="#FF4F4F"
                />
              </svg>
              {welcomeMessage && (
                <div className="flex-1 text-neutral-600 text-sm font-normal leading-normal tracking-tight pt-[6px]">
                  {welcomeMessage}
                </div>
              )}
            </div>
            {welcomeMessage && <div className="h-px"></div>}
            <div className="flex items-start gap-6">
              <div className="w-8"></div>
              <div className="flex-1 inline-flex justify-center items-center gap-2.5">
                <div className="flex-1 justify-start">
                  {activeSubStep?.id == firstRootChildStep?.id ? (
                    <span className="text-neutral-600 text-base font-bold leading-relaxed tracking-tight">
                      Get started:{""}
                    </span>
                  ) : null}
                  <span className="text-neutral-600 text-base font-semibold leading-relaxed tracking-tight">
                    {primaryText}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <div className="w-8"></div>
              <div
                className="flex-1 text-neutral-600 text-sm font-normal leading-normal tracking-tight prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: secondaryText }}
              />
            </div>
            <div className="flex justify-center items-center w-full mt-6">
              <div
                onClick={() => setIsPreviewOpen(true)}
                className="w-full max-w-md cursor-pointer group transition-all duration-200 hover:shadow-lg"
              >
                <div className="relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                  {/* Document Preview Header */}
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
                        <svg
                          className="w-3.5 h-3.5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        Document Preview
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 group-hover:text-blue-600 transition-colors duration-200">
                      <span>Click to expand</span>
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Document Preview Content */}
                  <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
                    <img
                      src="https://dth95m2xtyv8v.cloudfront.net/tesseract/assets/ec-api-global/Figma%20(13).png"
                      alt="Document Preview"
                      className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src =
                          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNDBMMTMwIDgwTDEwMCAxMjBMNzAgODBMMTAwIDQwWiIgZmlsbD0iIzkzQTNCNiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjc3NDg5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Eb2N1bWVudCBQcmV2aWV3PC90ZXh0Pgo8L3N2Zz4K"
                      }}
                    />
                    {/* Overlay with hover effect */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white bg-opacity-90 rounded-full p-2">
                        <svg
                          className="w-6 h-6 text-gray-700"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Document Preview Footer */}
                  <div className="p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600">
                          Integration Guide
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Ready
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">PDF</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Document Preview Modal */}
          {isPreviewOpen && (
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setIsPreviewOpen(false)
                }
              }}
            >
              <div className="relative w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-blue-600 dark:text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Document Preview
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <svg
                      className="w-5 h-5 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Modal Content - Image Preview */}
                <div className="relative overflow-auto max-h-[calc(90vh-160px)]">
                  <div className="flex items-center justify-center min-h-[400px] p-4">
                    <img
                      src="https://dth95m2xtyv8v.cloudfront.net/tesseract/assets/ec-api-global/Figma%20(13).png"
                      alt="Document Preview"
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg transition-transform duration-300 hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src =
                          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNTBMMTUwIDEwMEwxMDAgMTUwTDUwIDEwMEwxMDAgNTBaIiBmaWxsPSIjOTNBM0I2Ii8+PC9zdmc+Cg=="
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Chat Screen OA */}
          <div className="bg-white dark:bg-[#1E1E1E]">
            <OnboardingChatBox
              role={user?.role}
              user={user}
              initialChatId={chatId}
              onStepStatusUpdate={changeStepStatus}
              scrollContainerRef={scrollContainerRef}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MakeFlow;