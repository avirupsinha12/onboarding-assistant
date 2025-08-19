const turingQAUrl = "http://localhost:8088"
// "http://localhost:8088"

// Api Endpoints Turing

export const fetchContentUrl = turingQAUrl + "/content/fetch"

export const fetchFlowUrl = (baseUrl: string) =>
  baseUrl + "/merchant/flow/fetch"

export const createFlowUrl = (baseUrl: string) =>
  baseUrl + "/merchant/flow/create"

export const changeStepStatusUrl = (baseUrl: string) =>
  baseUrl + "/v2/changestepstatus"
