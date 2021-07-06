const MIN_SYNC_DELAY = 0; // must be MIN_SYNC_DELAY >= 0
const MAX_SYNC_DELAY = 3000;

class OptimizeInterval {
  static subInterval(time) {
    if (time - 100 >= MIN_SYNC_DELAY) {
      return time - 100;
    }
    return time;
  }

  static addInterval(time) {
    if (time + 100 < MAX_SYNC_DELAY) {
      return time + 500;
    }
    return time;
  }

  static sleep(timeout) {
    console.log('sleeping ... => ', timeout);
    return new Promise((resolve) => setTimeout(resolve, timeout));
  }
}

module.exports = {
  OptimizeInterval,
};
