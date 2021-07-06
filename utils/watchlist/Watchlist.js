class Watchlist {
  static toEmails = (watchlists) => {
    const emails = [];
    watchlists.find((o, i) => {
      emails.push(o.callbackEmail);
    });
    return emails;
  };

  static toCallbackUrls = (watchlists) => {
    const callbackUrls = [];
    watchlists.find((o, i) => {
      callbackUrls.push(o.callbackUrl);
    });
    return callbackUrls;
  };
}

module.exports = {
  Watchlist,
};
