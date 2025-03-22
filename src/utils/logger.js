const logger = {
    log: (...args) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(...args);
      }
    },
    error: (...args) => {
      console.error(...args);
    }
  };
  
  export default logger;
  