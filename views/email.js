const txInformHtml = (symbol, network, from, to, value, msg, txLink) => `
<html>
<head>
</head>
<body>
<h1>New Transaction </h1>
<br>
<h1>SYMBOL: ${symbol}</h1>
<h2>NETWORK: ${network}</h2>
<div>from: ${from}</div>
<div>to: ${to}</div>
<div>value: ${value} ${symbol}</div><br>
${msg}<br>
<br>
Transaction link: <a href=${txLink} target="_blank">${txLink}</a>
</body>
</html>
`;

module.exports = {
  txInformHtml,
};
