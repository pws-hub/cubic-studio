
export const MATCH_VARIABLE=/\{\{([a-zA-Z0-9_]+)\}\}/g
export const CLEAN_VARIABLE=/\{|\}/g

export const MATCH_PATH_VARIABLE=/\/:([a-zA-Z0-9_]+)/g
export const CLEAN_PATH_VARIABLE=/\/:/

export const MATCH_QUERY_VARIABLE=/\?(\w+=[a-zA-Z0-9_\-:\{\}\\\/%\+\*]*)|(&\w+=[a-zA-Z0-9_\-:\{\}\\\/%\+\*]*)/g
export const CLEAN_QUERY_VARIABLE=/\?|&/