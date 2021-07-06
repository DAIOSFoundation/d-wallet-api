db.createUser({
  user: 'wallet',
  pwd: 'changemepwdforwallet',
  roles: [
    {
      role: 'readWrite',
      db: 'd-wallet-api',
    },
  ],
});
