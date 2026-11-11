// React concurrent roots need an explicit act environment in this Jest setup.
// DOM tests wrap renders, events, timer updates and unmounts in act().
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
