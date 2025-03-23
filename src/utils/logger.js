const logger = {
    log: (...args) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(...args);
      }
    },
    error: (...args) => {
      console.error(...args);
    },
    warn: (...args) => {
      console.warn(...args);  // Add this method
    }
  };
  
  export default logger;