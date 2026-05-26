function createLogger(scope) {
  return {
    info(message) {
      console.log(`[${scope}] ${message}`);
    },
    error(message, error) {
      console.error(`[${scope}] ${message}`);
      if (error) {
        console.error(error);
      }
    },
  };
}

module.exports = {
  createLogger,
};
