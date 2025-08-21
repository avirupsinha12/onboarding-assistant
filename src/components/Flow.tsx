import { useState, useContext, useEffect, useRef } from "react"
import { FlowContext } from "../context/FlowProvider"
import { getComponentList, getFirstActiveSubStepInfo } from "../utility/FlowUtils";
import { changeStepStatusUrl, fetchFlowUrl } from "../api/ApiEndpoints"
import { CircularProgress } from "./CircularProgress";
import Navbar from "./NavBar";
import { getDefaultFlow } from "../constants/Default";
import { 
  Status, 
  Step, 
  FlowProps, 
  StepGeneratorData, 
  ComponentListData, 
  ChangeStepStatusObject, 
  ChangeStepStatusResponse 
} from "../types/Types";


const MakeFlow: React.FC<FlowProps> = ({
  title = "Welcome to Flow",
  flow,
  className,
  user
}) => {
  const { activeSubStep, setFlow, setActiveSubStep } = useContext(FlowContext)
  const [_, setChangeStepStatusError] = useState("")
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({})
  const [componentList, setComponentList] = useState<ComponentListData[]>([])
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false)
  const scrollFlowRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const totalSerialSteps = flow ? getComponentList(flow) : []
  const totalParentStepsCount =
    totalSerialSteps[0]?.serialComponents?.length || 0
  const totalParentStepsDoneCount =
    totalSerialSteps[0]?.serialComponents?.filter(
      (step) => step.data.step.status === "DONE",
    ).length || 0

  // Initialize flow, componentList and activeSubStep on first render
  useEffect(() => {
    if (!flow) {
      setFlow(flow || getDefaultFlow())
      return
    }
    const updatedComponentList = getComponentList(flow)
    setComponentList(updatedComponentList)
    
    // Set activeSubStep to first executable step if not already set
    if (!activeSubStep) {
      const stepDict: Record<string, Step> = {}
      flow.steps.forEach((step) => {
        stepDict[step.id] = step
      })
      
      const stepPropsArray: StepGeneratorData[] = updatedComponentList
        .flatMap((componentData) => componentData.serialComponents)
        .map((serialComponent) => serialComponent.data)
      
      const firstActiveSubstep = getFirstActiveSubStepInfo(
        stepPropsArray,
        stepDict,
      )
      
      if (firstActiveSubstep) {
        setActiveSubStep(firstActiveSubstep)
        
        // Expand parent step
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
  }, [flow, setFlow, setActiveSubStep, activeSubStep])
  
  useEffect(() => {
    if (scrollFlowRef?.current) {
      scrollFlowRef.current.scrollTop = scrollFlowRef.current.scrollHeight
    }
  }, [scrollFlowRef, activeSubStep])

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

        const merchantId = projectMerchantMap[title || "BBPS"]
            const flowResponse = await fetch(fetchFlowUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "xyne-token": "f0ea103ce0343188f96ee8457e10ba",
              },
              body: JSON.stringify({
                merchant_id: merchantId,
                product_name: "PP",
                merchant_type: "F1",
                scenario: "onboarding",
              }),
            })

            if (flowResponse.ok) {
              const freshFlowData = await flowResponse.json()
              if (freshFlowData?.flow_id) {
                currentFlowId = freshFlowData.flow_id
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
        flow_id: currentFlowId,
      }

      const changeStepStatusResponse = await fetch(
        changeStepStatusUrl,
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

  // Handle escape key to close preview modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isPreviewOpen) {
        setIsPreviewOpen(false)
      }
    }

    if (isPreviewOpen) {
      document.addEventListener("keydown", handleKeyDown)
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }
  }, [isPreviewOpen])
  
  return (
    <div id="flow-screen" className={className}>
      <Navbar
        projectName={title || "Ingestion Module"}
        progress={calculateFlowProgress()}
        parentStepsCount={totalParentStepsCount}
        parentStepsDoneCount={totalParentStepsDoneCount}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div
          ref={scrollFlowRef}
          className="lg:w-[32%] flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          style={{ height: 'calc(100vh - 64px)' }}
        >
          {/* Step Section */}
          <div className="w-full flex-1">
            {componentList.length > 0 ? (
              <div className="w-full px-4 lg:px-6 bg-white">
                <div className="space-y-3">
                  {componentList.flatMap((componentData) => 
                    componentData.serialComponents
                  ).map((serialComponent) => {
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
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
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
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
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
                                    }}
                                    key={childStepId}
                                    className={`cursor-pointer flex w-[357px] justify-start items-center gap-2 ml-8 transition-all duration-200 ease-in-out hover:bg-gray-50 rounded p-2 -m-2 ${
                                      childStep?.id == activeSubStep?.id 
                                        ? "bg-[#F1F4F9]" 
                                        : ""
                                    } ${
                                      isLastChildStepOfParent
                                        ? "mb-2" 
                                        : ""
                                    }`}
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
                                    <div className="not-italic justify-start text-sm leading-tight tracking-tight font-medium text-[#464D53]">
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
        
        {/* Right Side View */}
        <div 
          className="relative w-full lg:w-[68%] flex flex-col bg-white dark:bg-[#1E1E1E] overflow-hidden" 
          style={{ height: 'calc(100vh - 64px)' }}
        >
          {/* Scrollable Content Area */}
          <div 
            ref={scrollContainerRef} 
            className="flex-1 overflow-y-auto py-4 pl-[56px] pr-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          >
            {/* Active Substep Provider */}
            <div className="max-w-[670px] w-full self-stretch p-2 bg-neutral-100 rounded-[20px] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.15)] outline outline-1 outline-offset-[-1px] outline-slate-200 justify-start items-start flex flex-col gap-2 overflow-hidden">
              <div className="self-stretch px-4 pt-3 pb-2 inline-flex justify-start items-center gap-1.5">
                <div className="justify-start text-gray-900 text-base font-semibold font-['Inter']">
                  Getting started with integration
                </div>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path 
                    fillRule="evenodd" 
                    clipRule="evenodd" 
                    d="M5.21967 11.7803C4.92678 11.4874 4.92678 11.0126 5.21967 10.7197L9.2197 6.7197C9.5126 6.4268 9.9874 6.4268 10.2803 6.7197L14.2803 10.7197C14.5732 11.0126 14.5732 11.4874 14.2803 11.7803C13.9874 12.0732 13.5126 12.0732 13.2197 11.7803L9.75 8.3107L6.28033 11.7803C5.98744 12.0732 5.51256 12.0732 5.21967 11.7803Z" 
                    fill="black"
                  />
                </svg>
              </div>
              <div className="self-stretch flex-1 p-6 bg-gray-50 rounded-2xl flex flex-col justify-start items-start gap-8 overflow-hidden">
                <div className="self-stretch justify-start text-gray-800 text-sm font-normal font-['Inter'] leading-snug">
                  Welcome to the DPIP integration journey! This first step is all about getting acquainted with the system architecture. 
                  Understanding the "what" and "why" will set you up for success before we dive into the technical aspects. 
                  Let's embark on this exciting journey together!
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
              <div className="self-stretch pt-2 inline-flex justify-end items-center gap-2.5 overflow-hidden cursor-pointer">
                <div className="flex-1 h-10 px-6 py-1.5 bg-gray-900 rounded-3xl outline outline-1 outline-offset-[-1px] flex justify-center items-center gap-1.5">
                  <svg width="15" height="14" viewBox="0 0 15 14" fill="none">
                    <path 
                      d="M12.1668 3.5L5.75016 9.91667L2.8335 7" 
                      stroke="white" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="text-right justify-start text-gray-50 text-xs font-bold font-['JetBrains_Mono'] uppercase leading-none tracking-wide">
                    Mark as DONE
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
                  <div className="relative overflow-auto max-h-[calc(90vh-160px)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
            <div className="self-stretch pt-6 inline-flex flex-col justify-start items-start gap-1">
              <div className="self-stretch h-9 py-1.5 inline-flex justify-between items-center w-[670px]">
                <div className="flex-1 justify-start text-gray-800 text-sm font-['Inter'] leading-normal">
                  What is DPIP architecture?
                </div>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path 
                    d="M6.75 13.5L11.25 9L6.75 4.5" 
                    stroke="#464D53" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div data-type="solid" className="self-stretch py-0.5 flex flex-col justify-center items-center w-[670px]">
                <div className="self-stretch h-px bg-gray-300" />
              </div>
              <div className="self-stretch h-9 py-1.5 inline-flex justify-between items-center w-[670px]">
                <div className="flex-1 justify-start text-gray-800 text-sm font-['Inter'] leading-normal">
                  How do I start integration?
                </div>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path 
                    d="M6.75 13.5L11.25 9L6.75 4.5" 
                    stroke="#464D53" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div data-type="solid" className="self-stretch py-0.5 flex flex-col justify-center items-center w-[670px]">
                <div className="self-stretch h-px bg-gray-300" />
              </div>
              <div className="self-stretch h-9 py-1.5 inline-flex justify-between items-center w-[670px]">
                <div className="flex-1 justify-start text-gray-800 text-sm font-['Inter'] leading-normal">
                  How do I access the documentation?
                </div>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path 
                    d="M6.75 13.5L11.25 9L6.75 4.5" 
                    stroke="#464D53" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div onClick={() => {}} className="self-stretch h-10 py-1.5 bg-white rounded-3xl outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-center items-center gap-1.5 w-[670px] cursor-pointer">
                <div className="text-right justify-start text-gray-800 text-sm font-bold font-['JetBrains_Mono'] uppercase tracking-wide">
                  Ask another question
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MakeFlow;