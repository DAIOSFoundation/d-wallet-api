const {
  Account,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
} = require('@solana/web3.js');
const BufferLayout = require('buffer-layout');
const {Token} = require('@solana/spl-token');
const {struct, u8, nu64} = require('buffer-layout');
const {publicKey, u64, u128} = require('@project-serum/borsh');
const BigNumber = require('bignumber.js');

function lt(a, b) {
  const valueA = new BigNumber(a);
  const valueB = new BigNumber(b);

  return valueA.isLessThan(valueB);
}

class TokenAmount {
  constructor(wei, decimals, isWei = true) {
    this.decimals = decimals;
    this._decimals = new BigNumber(10).exponentiatedBy(decimals);

    if (isWei) {
      this.wei = new BigNumber(wei);
    } else {
      this.wei = new BigNumber(wei).multipliedBy(this._decimals);
    }
  }

  toEther() {
    return this.wei.dividedBy(this._decimals);
  }

  toWei() {
    return this.wei;
  }

  format() {
    const vaule = this.wei.dividedBy(this._decimals);
    return vaule.toFormat(vaule.isInteger() ? 0 : this.decimals);
  }

  fixed() {
    return this.wei.dividedBy(this._decimals).toFixed(this.decimals);
  }

  isNullOrZero() {
    return this.wei.isNaN() || this.wei.isZero();
  }

  // + plus
  // - minus
  // × multipliedBy
  // ÷ dividedBy
}

const toSOL = (value, decimals) => {
  return value / 10 ** (decimals || 9);
};
const fromSOL = (value, decimals) => {
  return value * 10 ** (decimals || 9);
};

const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);

const WRAPPED_SOL_MINT = new PublicKey(
  'So11111111111111111111111111111111111111112',
);

const STAKE_PROGRAM_ID = 'EhhTKczWMGQt46ynNeRX1WfeagwwJd7ufHvCDjRxjo5Q';
const STAKE_PROGRAM_ID_V4 = 'CBuCnLe26faBpcBP2fktp4rp8abpcAnTWft6ZrP5Q4T';
const STAKE_PROGRAM_ID_V5 = '9KEPoZmtHUrBbhWN1v1KWLMkkvwY6WLtAVUCPRtRjP4z';

const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

const MEMO_PROGRAM_ID = new PublicKey(
  'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',
);

const STAKE_INFO_LAYOUT = struct([
  u64('state'),
  u64('nonce'),
  publicKey('poolLpTokenAccount'),
  publicKey('poolRewardTokenAccount'),
  publicKey('owner'),
  publicKey('feeOwner'),
  u64('feeY'),
  u64('feeX'),
  u64('totalReward'),
  u128('rewardPerShareNet'),
  u64('lastBlock'),
  u64('rewardPerBlock'),
]);

const NATIVE_SOL = {
  symbol: 'SOL',
  name: 'Native Solana',
  mintAddress: '11111111111111111111111111111111',
  decimals: 9,
  tags: ['raydium'],
};

const TOKENS = {
  WSOL: {
    symbol: 'WSOL',
    name: 'Wrapped Solana',
    mintAddress: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    referrer: 'HTcarLHe7WRxBQCWvhVB8AP56pnEtJUV2jDGvcpY3xo5',
    tags: ['raydium'],
  },
  BTC: {
    symbol: 'BTC',
    name: 'Wrapped Bitcoin',
    mintAddress: '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E',
    decimals: 6,
    referrer: 'GZpS8cY8Nt8HuqxzJh6PXTdSxc38vFUjBmi7eEUkkQtG',
    tags: ['raydium'],
  },
  ETH: {
    symbol: 'ETH',
    name: 'Wrapped Ethereum',
    mintAddress: '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk',
    decimals: 6,
    referrer: 'CXPTcSxxh4AT38gtv3SPbLS7oZVgXzLbMb83o4ziXjjN',
    tags: ['raydium'],
  },
  USDT: {
    symbol: 'USDT',
    name: 'USDT',
    mintAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    decimals: 6,
    referrer: '8DwwDNagph8SdwMUdcXS5L9YAyutTyDJmK6cTKrmNFk3',
    tags: ['raydium'],
  },
  WUSDT: {
    symbol: 'WUSDT',
    name: 'Wrapped USDT',
    mintAddress: 'BQcdHdAQW1hczDbBi9hiegXAR7A98Q9jx3X3iBBBDiq4',
    decimals: 6,
    referrer: 'CA98hYunCLKgBuD6N8MJSgq1GbW9CXdksLf5mw736tS3',
    tags: ['raydium'],
  },
  USDC: {
    symbol: 'USDC',
    name: 'USDC',
    mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    referrer: '92vdtNjEg6Zth3UU1MgPgTVFjSEzTHx66aCdqWdcRkrg',
    tags: ['raydium'],
  },
  WUSDC: {
    symbol: 'WUSDC',
    name: 'Wrapped USDC',
    mintAddress: 'BXXkv6z8ykpG1yuvUDPgh732wzVHB69RnB9YgSYh3itW',
    decimals: 6,
    tags: ['raydium'],
  },
  YFI: {
    symbol: 'YFI',
    name: 'Wrapped YFI',
    mintAddress: '3JSf5tPeuscJGtaCp5giEiDhv51gQ4v3zWg8DGgyLfAB',
    decimals: 6,
    referrer: 'DZjgzKfYzZBBSTo5vytMYvGdNF933DvuX8TftDMrThrb',
    tags: ['raydium'],
  },
  LINK: {
    symbol: 'LINK',
    name: 'Wrapped Chainlink',
    mintAddress: 'CWE8jPTUYhdCTZYWPTe1o5DFqfdjzWKc9WKz6rSjQUdG',
    decimals: 6,
    referrer: 'DRSKKsYZaPEFkRgGywo7KWBGZikf71R9aDr8tjtpr41V',
    tags: ['raydium'],
  },
  XRP: {
    symbol: 'XRP',
    name: 'Wrapped XRP',
    mintAddress: 'Ga2AXHpfAF6mv2ekZwcsJFqu7wB4NV331qNH7fW9Nst8',
    decimals: 6,
    referrer: '6NeHPXG142tAE2Ej3gHgT2N66i1KH6PFR6PBZw6RyrwH',
    tags: ['raydium'],
  },
  SUSHI: {
    symbol: 'SUSHI',
    name: 'Wrapped SUSHI',
    mintAddress: 'AR1Mtgh7zAtxuxGd2XPovXPVjcSdY3i4rQYisNadjfKy',
    decimals: 6,
    referrer: '59QxHeHgb28tDc3gStnrW8FNKC9qWuRmRZHBaAqCerJX',
    tags: ['raydium'],
  },
  ALEPH: {
    symbol: 'ALEPH',
    name: 'Wrapped ALEPH',
    mintAddress: 'CsZ5LZkDS7h9TDKjrbL7VAwQZ9nsRu8vJLhRYfmGaN8K',
    decimals: 6,
    referrer: '8FKAKrenJMDd7V6cxnM5BsymHTjqxgodtHbLwZReMnWW',
    tags: ['raydium'],
  },
  SXP: {
    symbol: 'SXP',
    name: 'Wrapped SXP',
    mintAddress: 'SF3oTvfWzEP3DTwGSvUXRrGTvr75pdZNnBLAH9bzMuX',
    decimals: 6,
    referrer: '97Vyotr284UM2Fyq9gbfQ3azMYtgf7cjnsf8pN1PFfY9',
    tags: ['raydium'],
  },
  HGET: {
    symbol: 'HGET',
    name: 'Wrapped HGET',
    mintAddress: 'BtZQfWqDGbk9Wf2rXEiWyQBdBY1etnUUn6zEphvVS7yN',
    decimals: 6,
    referrer: 'AGY2wy1ANzLM2jJLSkVxPUYAY5iAYXYsLMQkoQsAhucj',
    tags: ['raydium'],
  },
  CREAM: {
    symbol: 'CREAM',
    name: 'Wrapped CREAM',
    mintAddress: '5Fu5UUgbjpUvdBveb3a1JTNirL8rXtiYeSMWvKjtUNQv',
    decimals: 6,
    referrer: '7WPzEiozJ69MQe8bfbss1t2unR6bHR4S7FimiUVRgu7P',
    tags: ['raydium'],
  },
  UBXT: {
    symbol: 'UBXT',
    name: 'Wrapped UBXT',
    mintAddress: '873KLxCbz7s9Kc4ZzgYRtNmhfkQrhfyWGZJBmyCbC3ei',
    decimals: 6,
    referrer: '9aocFzNkSVj9TCS6cJk2uYyuzEpXPWT7xoBBF9JcZ879',
    tags: ['raydium'],
  },
  HNT: {
    symbol: 'HNT',
    name: 'Wrapped HNT',
    mintAddress: 'HqB7uswoVg4suaQiDP3wjxob1G5WdZ144zhdStwMCq7e',
    decimals: 6,
    referrer: 'B61oHrGCFh8P75Z2cRDiw2nbEwbMyhVfZhMWiwxU2qCV',
    tags: ['raydium'],
  },
  FRONT: {
    symbol: 'FRONT',
    name: 'Wrapped FRONT',
    mintAddress: '9S4t2NEAiJVMvPdRYKVrfJpBafPBLtvbvyS3DecojQHw',
    decimals: 6,
    referrer: 'FnasnCc7c43hd2nanSmRjh9Sf9Cgz6aEvNj6wpDznS5h',
    tags: ['raydium'],
  },
  AKRO: {
    symbol: 'AKRO',
    name: 'Wrapped AKRO',
    mintAddress: '6WNVCuxCGJzNjmMZoKyhZJwvJ5tYpsLyAtagzYASqBoF',
    decimals: 6,
    referrer: 'FihBmWJbiLSEvq4QZpPPdjokdMgxqq6pESZ7oMkE1qJH',
    tags: ['raydium'],
  },
  HXRO: {
    symbol: 'HXRO',
    name: 'Wrapped HXRO',
    mintAddress: 'DJafV9qemGp7mLMEn5wrfqaFwxsbLgUsGVS16zKRk9kc',
    decimals: 6,
    referrer: '4NgrGZDRCzyqiwYvKPEePTKfQXtWzKmSDBoZJjRw6wNC',
    tags: ['raydium'],
  },
  UNI: {
    symbol: 'UNI',
    name: 'Wrapped UNI',
    mintAddress: 'DEhAasscXF4kEGxFgJ3bq4PpVGp5wyUxMRvn6TzGVHaw',
    decimals: 6,
    referrer: '4ntxDv95ajBbXfZyGy3UhcQDx8xmH1yJ6eKvuNNH466x',
    tags: ['raydium'],
  },
  SRM: {
    symbol: 'SRM',
    name: 'Serum',
    mintAddress: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
    decimals: 6,
    referrer: 'HYxa4Ea1dz7ya17Cx18rEGUA1WbCvKjXjFKrnu8CwugH',
    tags: ['raydium'],
  },
  FTT: {
    symbol: 'FTT',
    name: 'Wrapped FTT',
    mintAddress: 'AGFEad2et2ZJif9jaGpdMixQqvW5i81aBdvKe7PHNfz3',
    decimals: 6,
    referrer: 'CafpgSh8KGL2GPTjdXfctD3vXngNZDJ3Q92FTfV71Hmt',
    tags: ['raydium'],
  },
  MSRM: {
    symbol: 'MSRM',
    name: 'MegaSerum',
    mintAddress: 'MSRMcoVyrFxnSgo5uXwone5SKcGhT1KEJMFEkMEWf9L',
    decimals: 0,
    referrer: 'Ge5q9x8gDUNYqqLA1MdnCzWNJGsbj3M15Yxse2cDbw9z',
    tags: ['raydium'],
  },
  TOMO: {
    symbol: 'TOMO',
    name: 'Wrapped TOMO',
    mintAddress: 'GXMvfY2jpQctDqZ9RoU3oWPhufKiCcFEfchvYumtX7jd',
    decimals: 6,
    referrer: '9fexfN3eZomF5gfenG5L9ydbKRQkPhq6x74rb5iLrvXP',
    tags: ['raydium'],
  },
  KARMA: {
    symbol: 'KARMA',
    name: 'Wrapped KARMA',
    mintAddress: 'EcqExpGNFBve2i1cMJUTR4bPXj4ZoqmDD2rTkeCcaTFX',
    decimals: 4,
    tags: ['raydium'],
  },
  LUA: {
    symbol: 'LUA',
    name: 'Wrapped LUA',
    mintAddress: 'EqWCKXfs3x47uVosDpTRgFniThL9Y8iCztJaapxbEaVX',
    decimals: 6,
    referrer: 'HuZwNApjVFuFSDgrwZA8GP2JD7WMby4qt6rkWDnaMo7j',
    tags: ['raydium'],
  },
  MATH: {
    symbol: 'MATH',
    name: 'Wrapped MATH',
    mintAddress: 'GeDS162t9yGJuLEHPWXXGrb1zwkzinCgRwnT8vHYjKza',
    decimals: 6,
    referrer: 'C9K1M8sJX8WMdsnFT7DuzdiHHunEj79EsLuz4DixQYGm',
    tags: ['raydium'],
  },
  KEEP: {
    symbol: 'KEEP',
    name: 'Wrapped KEEP',
    mintAddress: 'GUohe4DJUA5FKPWo3joiPgsB7yzer7LpDmt1Vhzy3Zht',
    decimals: 6,
    tags: ['raydium'],
  },
  SWAG: {
    symbol: 'SWAG',
    name: 'Wrapped SWAG',
    mintAddress: '9F9fNTT6qwjsu4X4yWYKZpsbw5qT7o6yR2i57JF2jagy',
    decimals: 6,
    tags: ['raydium'],
  },
  FIDA: {
    symbol: 'FIDA',
    name: 'Bonfida',
    mintAddress: 'EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp',
    decimals: 6,
    referrer: 'AeAsG75UmyPDB271c6NHonHxXAPXfkvhcf2xjfJhReS8',
    tags: ['raydium'],
  },
  KIN: {
    symbol: 'KIN',
    name: 'KIN',
    mintAddress: 'kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6',
    decimals: 5,
    referrer: 'AevFXmApVxN2yk1iemSxXc6Wy7Z1udUEfST11kuYKmr9',
    tags: ['raydium'],
  },
  MAPS: {
    symbol: 'MAPS',
    name: 'MAPS',
    mintAddress: 'MAPS41MDahZ9QdKXhVa4dWB9RuyfV4XqhyAZ8XcYepb',
    decimals: 6,
    tags: ['raydium'],
  },
  OXY: {
    symbol: 'OXY',
    name: 'OXY',
    mintAddress: 'z3dn17yLaGMKffVogeFHQ9zWVcXgqgf3PQnDsNs2g6M',
    decimals: 6,
    tags: ['raydium'],
  },
  RAY: {
    symbol: 'RAY',
    name: 'Raydium',
    mintAddress: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    referrer: '33XpMmMQRf6tSPpmYyzpwU4uXpZHkFwCZsusD9dMYkjy',
    tags: ['raydium'],
  },
  xCOPE: {
    symbol: 'xCOPE',
    name: 'xCOPE',
    mintAddress: '3K6rftdAaQYMPunrtNRHgnK2UAtjm2JwyT2oCiTDouYE',
    decimals: 0,
    referrer: '8DTehuES4tfnd2SrqcjN52XofxWXGjiLZRgM12U9pB6f',
    tags: ['raydium'],
  },
  COPE: {
    symbol: 'COPE',
    name: 'COPE',
    mintAddress: '8HGyAAB1yoM1ttS7pXjHMa3dukTFGQggnFFH3hJZgzQh',
    decimals: 6,
    referrer: 'G7UYwWhkmgeL57SUKFF45K663V9TdXZw6Ho6ZLQ7p4p',
    tags: ['raydium'],
  },
  STEP: {
    symbol: 'STEP',
    name: 'STEP',
    mintAddress: 'StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT',
    decimals: 9,
    referrer: 'EFQVX1S6dFroDDhJDAnMTX4fCfjt4fJXHdk1eEtJ2uRY',
    tags: ['raydium'],
  },
  MEDIA: {
    symbol: 'MEDIA',
    name: 'MEDIA',
    mintAddress: 'ETAtLmCmsoiEEKfNrHKJ2kYy3MoABhU6NQvpSfij5tDs',
    decimals: 6,
    referrer: 'AYnaG3AidNWFzjq9U3BJSsQ9DShE8g7FszriBDtRFvsx',

    details:
      'Media Network is a new protocol that bypasses traditional CDN providers’ centralized approach for a self-governed and open source solution where everyone can participate. Media Network creates a distributed bandwidth market that enables service providers such as media platforms to hire resources from the network and dynamically come and go as the demand for last-mile data delivery shifts. It allows anyone to organically serve content without introducing any trust assumptions or pre-authentication requirements. Participants earn MEDIA rewards for their bandwidth contributions, a fixed supply SPL token minted on Solana’s Blockchain.',
    docs: {
      website: 'https://media.network/',
      whitepaper: 'https://media.network/whitepaper.pdf',
    },
    socials: {
      Twitter: 'https://twitter.com/Media_FDN',
      Telegram: 'https://t.me/Media_FDN',
      Medium: 'https://mediafoundation.medium.com/',
    },
    tags: ['raydium'],
  },
  ROPE: {
    symbol: 'ROPE',
    name: 'ROPE',
    mintAddress: '8PMHT4swUMtBzgHnh5U564N5sjPSiUz2cjEQzFnnP1Fo',
    decimals: 9,
    referrer: '5sGVVniBSPLTwRHDETShovq7STRH2rJwbvdvvH3NcVTF',
    tags: ['raydium'],
  },
  MER: {
    symbol: 'MER',
    name: 'Mercurial',
    mintAddress: 'MERt85fc5boKw3BW1eYdxonEuJNvXbiMbs6hvheau5K',
    decimals: 6,
    referrer: '36F4ryvqaNW2yKQsAry4ZHCZ3j7tz3gtEz7NEwv7pSRu',

    details:
      'Mercurial Finance\nMercurial is building DeFi’s first dynamic vaults for stable assets on Solana, providing the technical tools for users to easily deposit, swap and mint stable assets.\n\nInnovations\nMercurial will be introducing several key new technical innovations, including on-chain algorithms to regulate the flow of assets and dynamic fees that tap on the market and price data to assist LPs in optimizing performance. We will also be developing a unique pricing curve that will be the first to combine high efficiency, multi-token support, and generalizability for all types of token sets.\n\nMaximizing Capital Utlilization\nMercurial vaults will dynamically utilize assets for a wide range of use cases, like low slippage swaps, lending, flash loans, and external third-party decentralized protocols. To increase pegged assets availability on Solana, we will allow the creation of synthetics, like mUSD or mBTC, which can be added to our vaults to improve liquidity for other stables and facilitate interaction with other third-party decentralized protocols.\n\nStarting with a vault for the most common stables, for example, USDC, USDT, wUSDC, and wDAI, we will be facilitating low slippage swaps with dynamic fees. Features will be added as key technical and ecosystem pieces become available on Solana, i.e. inter-program composability, price oracles, etc.\n\nMER\nThe MER token will be used to accrue value for the holder via fees from swaps, commission from yield farms, and as collateral for synthetic stables like mUSD. MER will also be intrinsically linked to the governance and growth of Mercurial, playing a crucial role in regulating the system across governance, insurance, and bootstrapping.',
    docs: {
      website: 'https://www.mercurial.finance/',
      whitepaper: 'https://www.mercurial.finance/Mercurial-Lite-Paper-v1.pdf',
    },
    socials: {
      Twitter: 'https://twitter.com/MercurialFi',
      Telegram: 'https://t.me/MercurialFi',
      Medium: 'https://mercurialfi.medium.com/',
    },
    tags: ['raydium'],
  },
  TULIP: {
    symbol: 'TULIP',
    name: 'TULIP',
    mintAddress: 'TuLipcqtGVXP9XR62wM8WWCm6a9vhLs7T1uoWBk6FDs',
    decimals: 6,
    referrer: 'Bcw1TvX8jUj6CtY2a7GU2THeYVAudvmT8yzRypVMVsSH',
    tags: ['raydium'],
  },
  SNY: {
    symbol: 'SNY',
    name: 'SNY',
    mintAddress: '4dmKkXNHdgYsXqBHCuMikNQWwVomZURhYvkkX5c4pQ7y',
    decimals: 6,
    referrer: 'G7gyaTNn2hgjF67SWs4Ee9PEaFU2xadhtXL8HmkJ2cNL',

    detailLink:
      'https://raydium.medium.com/synthetify-launching-on-acceleraytor-3755b4903f88',
    details:
      'Synthetify is a decentralized protocol that allows for the creation and exchange of synthetic assets that closely track the price of underlying assets. Synthetify’s synthetics adhere to the SPL token standard, allowing them to be easily integrated with DeFi applications across the Solana ecosystem.\n\nSynthetify leverages Solana to enable a fast, cheap and intuitive trading experience for users of the platform while staying fully decentralized thanks to an infrastructure that relies on smart contracts and blockchain oracles.\n\nThe Synthetify Token (SNY) gives the ability to participate in the protocol through staking. Stakers receive a pro rata share of fees generated by the exchange as well as additional rewards. SNY acts as a collateral token for all synthetic assets created on the platform and each token will have voting power on future governance proposals.',
    docs: {
      website: 'https://synthetify.io/',
      whitepaper: 'https://resources.synthetify.io/synthetify-whitepaper.pdf',
    },
    socials: {
      Twitter: 'https://twitter.com/synthetify',
      Telegram: 'https://t.me/synthetify',
      Medium: 'https://synthetify.medium.com/',
    },
    tags: ['raydium'],
  },
  SLRS: {
    symbol: 'SLRS',
    name: 'SLRS',
    mintAddress: 'SLRSSpSLUTP7okbCUBYStWCo1vUgyt775faPqz8HUMr',
    decimals: 6,
    referrer: 'AmqeHgTdm6kBzy5ewZFKuMAfbynZmhve1GQxbJzQFLbP',

    detailLink:
      'https://raydium.medium.com/solrise-is-launching-on-acceleraytor-c2c980362037',
    details:
      'Solrise Finance is a fully decentralized and non-custodial protocol for investment funds on Solana. What this means in practice is that anyone can open a fund, and anyone can invest in it.\n\nSolrise’s platform allows fund managers from all across the globe — whether they are well-established and looking for a new channel, or ambitious rookies with something to prove — to open a fund, with performance kept completely transparent.\n\nExisting decentralized fund management platforms on Ethereum are suffering from brutally high transaction fees. With Solrise, you can create, enter, and exit funds all for under $0.01.',
    docs: {
      website: 'https://solrise.finance/',
      docs: 'https://docs.solrise.finance/',
    },
    socials: {
      Twitter: 'https://twitter.com/SolriseFinance',
      Telegram: 'https://t.me/solrisefinance',
      Medium: 'https://blog.solrise.finance/',
    },
    tags: ['raydium'],
  },
  WOO: {
    symbol: 'WOO',
    name: 'Wootrade Network',
    mintAddress: 'E5rk3nmgLUuKUiS94gg4bpWwWwyjCMtddsAXkTFLtHEy',
    decimals: 6,
    referrer: '7UbeAZxpza5zN3QawQ5KsUo88zXvohUncYB9Zk5QCiim',
    tags: ['raydium'],
  },
  BOP: {
    symbol: 'BOP',
    name: 'Boring Protocol',
    mintAddress: 'BLwTnYKqf7u4qjgZrrsKeNs2EzWkMLqVCu6j8iHyrNA3',
    decimals: 8,
    referrer: 'FWxBZmNsvNckx8DnaL2NuyMtiQmT1x529WwV4e1UWiGk',
    tags: ['raydium'],
  },
  SAMO: {
    symbol: 'SAMO',
    name: 'Samoyed Coin',
    mintAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    decimals: 9,
    referrer: 'FnMDNFL9t8EpbADSU3hLWBtx7SuwRBB6NM84U3PzSkUu',
    tags: ['raydium'],
  },
  renBTC: {
    symbol: 'renBTC',
    name: 'renBTC',
    mintAddress: 'CDJWUqTcYTVAKXAVXoQZFes5JUFc7owSeq7eMQcDSbo5',
    decimals: 8,
    referrer: '7rr64uygy3o5RKVeNv12JGDUFMXVdr2YHvA3NTxzbZT6',
    tags: ['raydium'],
  },
  renDOGE: {
    symbol: 'renDOGE',
    name: 'renDOGE',
    mintAddress: 'ArUkYE2XDKzqy77PRRGjo4wREWwqk6RXTfM9NeqzPvjU',
    decimals: 8,
    referrer: 'J5g7uvJRGnpRyLnRQjFs1MqMkiTVgjxVJCXocu4B4BcZ',
    tags: ['raydium'],
  },
  LIKE: {
    symbol: 'LIKE',
    name: 'LIKE',
    mintAddress: '3bRTivrVsitbmCTGtqwp7hxXPsybkjn4XLNtPsHqa3zR',
    decimals: 9,
    referrer: '2rnVeVGfM88XqyNyBzGWEb7JViYKqncFzjWq5h1ujS9A',

    detailLink:
      'https://raydium.medium.com/only1-is-launching-on-acceleraytor-41ecb89dcc4e',
    details:
      'Only1 is the first NFT-powered social platform built on the Solana blockchain. Mixing social media, an NFT marketplace, a scalable blockchain, and the native token — $LIKE, Only1 offers fans a unique way of connecting with the creators they love.\n\nBy using the Only1 platform, fans will have the ability to invest, access, and earn from the limited edition contents created by the world’s largest influencers/celebrities, all powered by NFTs.',
    docs: {
      website: 'https://only1.io/',
      whitepaper: 'https://only1.io/pitch-deck.pdf',
    },
    socials: {
      Twitter: 'https://twitter.com/only1nft',
      Telegram: 'https://t.me/only1nft',
      Medium: 'https://medium.com/@only1nft',
      Discord: 'https://discord.gg/sUu7KZwNCB',
    },
    tags: ['raydium'],
  },
  DXL: {
    symbol: 'DXL',
    name: 'DXL',
    mintAddress: 'GsNzxJfFn6zQdJGeYsupJWzUAm57Ba7335mfhWvFiE9Z',
    decimals: 6,
    referrer: 'HF7mhT9YgD5CULAFDYQmhnUMi1FnNbKeBFCy9SZDh2XE',
    tags: ['raydium'],
  },
  mSOL: {
    symbol: 'mSOL',
    name: 'Marinade staked SOL (mSOL)',
    mintAddress: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
    decimals: 9,
    referrer: '7h5bckf8P29RdviNoKjDyH3Ky3uwdrBiPgYuSCD4asV5',
    tags: ['raydium'],
  },
  PAI: {
    symbol: 'PAI',
    name: 'PAI (Parrot)',
    mintAddress: 'Ea5SjE2Y6yvCeW5dYTn7PYMuW5ikXkvbGdcmSnXeaLjS',
    decimals: 6,
    referrer: '54X98LAxRR2j1KMBBXkbYyUaAWi1iKW9G1Y4TnTJVY2e',
    tags: ['raydium'],
  },
  PORT: {
    symbol: 'PORT',
    name: 'PORT',
    mintAddress: 'PoRTjZMPXb9T7dyU7tpLEZRQj7e6ssfAE62j2oQuc6y',
    decimals: 6,
    referrer: '5Ve8q9fb7R2DhdqGV4o1RVy7xxo4D6ifQfbxGiASdxEH',
    tags: ['raydium'],
  },
  MNGO: {
    symbol: 'MNGO',
    name: 'Mango',
    mintAddress: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',
    decimals: 6,
    referrer: 'CijuvE6qDpxZ5WqdEQEe7mS11fXEKiiHc7RR8wRiGzjY',
    tags: ['raydium'],
  },
  CRP: {
    symbol: 'CRP',
    name: 'CRP',
    mintAddress: 'DubwWZNWiNGMMeeQHPnMATNj77YZPZSAz2WVR5WjLJqz',
    decimals: 9,
    referrer: 'FKocyVJptELTbnkUkDRmT7y6hUem2JYrqHoph9uyvQXt',
    tags: ['raydium'],
  },
  ATLAS: {
    symbol: 'ATLAS',
    name: 'ATLAS',
    mintAddress: 'ATLASXmbPQxBUYbxPsV97usA3fPQYEqzQBUHgiFCUsXx',
    decimals: 8,
    referrer: '9t9mzbkMtLdazj1D9JycS15Geb1KVtcDt4XyAkpM72Ee',

    detailLink:
      'https://raydium.medium.com/star-atlas-is-launching-on-acceleraytor-fa35cfe3291f',
    details:
      'POLIS is the primary governance token of Star Atlas.\n\nStar Atlas is a grand strategy game that combines space exploration, territorial conquest, and political domination. In the distant future, players can join one of three galactic factions to directly influence the course of the metaverse and earn real-world income for their contributions.\n\nThe Star Atlas offers a unique gaming experience by combining block chain mechanics with traditional game mechanics. All assets in the metaverse are directly owned by players, and can be traded on the marketplace or exchanged on other cryptocurrency networks.',
    docs: {
      website: 'https://staratlas.com/',
      whitepaper: 'https://staratlas.com/files/star-atlas-white-paper.pdf',
    },
    socials: {
      Twitter: 'https://twitter.com/staratlas',
      Telegram: 'https://t.me/staratlasgame',
      Medium: 'https://medium.com/star-atlas',
      Discord: 'https://discord.gg/staratlas',
      Twitch: 'https://www.twitch.tv/staratlasgame',
      Youtube:
        'https://www.youtube.com/channel/UCt-y8Npwje5KDG5MSZ0a9Jw/videos',
    },
    tags: ['raydium'],
  },
  POLIS: {
    symbol: 'POLIS',
    name: 'POLIS',
    mintAddress: 'poLisWXnNRwC6oBu1vHiuKQzFjGL4XDSu4g9qjz9qVk',
    decimals: 8,
    referrer: 'CQ7HWCeSSp3tAfWzqH7ZEzgnTBr5Tvz1No3Y1xbiWzBm',

    detailLink:
      'https://raydium.medium.com/star-atlas-is-launching-on-acceleraytor-fa35cfe3291f',
    details:
      'POLIS is the primary governance token of Star Atlas.\n\nStar Atlas is a grand strategy game that combines space exploration, territorial conquest, and political domination. In the distant future, players can join one of three galactic factions to directly influence the course of the metaverse and earn real-world income for their contributions.\n\nThe Star Atlas offers a unique gaming experience by combining block chain mechanics with traditional game mechanics. All assets in the metaverse are directly owned by players, and can be traded on the marketplace or exchanged on other cryptocurrency networks.',
    docs: {
      website: 'https://staratlas.com/',
      whitepaper: 'https://staratlas.com/files/star-atlas-white-paper.pdf',
    },
    socials: {
      Twitter: 'https://twitter.com/staratlas',
      Telegram: 'https://t.me/staratlasgame',
      Medium: 'https://medium.com/star-atlas',
      Discord: 'https://discord.gg/staratlas',
      Twitch: 'https://www.twitch.tv/staratlasgame',
      Youtube:
        'https://www.youtube.com/channel/UCt-y8Npwje5KDG5MSZ0a9Jw/videos',
    },
    tags: ['raydium'],
  },
  GRAPE: {
    symbol: 'GRAPE',
    name: 'GRAPE',
    mintAddress: '8upjSpvjcdpuzhfR1zriwg5NXkwDruejqNE9WNbPRtyA',
    decimals: 6,
    referrer: 'M4nDMB9krXbaNFPVu1DjrBTfqPUHbKEQLZSSDNH2JrL',

    detailLink:
      'https://raydium.medium.com/grape-protocol-launching-on-acceleraytor-547f58c12937',
    details:
      'The GRAPE “Great Ape” community is a token-based membership community focused on accelerating the growth and adoption of Solana. GRAPE token holders at different tiers are rewarded with exclusive benefits and monthly emissions of GRAPE. You can find more details on the GRAPE membership tiers and benefits here.\n\nThe GRAPE toolset creates a framework for decentralized and tokenized communities to better organize and coordinate their activities, unlocking a whole new world of possibility for these dynamic groups. The GRAPE roadmap includes modules for DAO Management, non-custodial tipping, escrow, and event planning to be deployed in the next 6 months.\n\nGRAPE protocol’s first tool, Grape Access, creates a Dynamic Balance-Based Membership solution by connecting members’ social accounts to cryptographic keys. All Solana tokens are supported by Multi-Coin configurations, which grants users permission and access rights based on SPL tokens, token pairs, and LP tokens in their wallet.',
    docs: {
      website: 'https://grapes.network/',
      // whitepaper: '' // TODO
    },
    socials: {
      Discord: 'https://discord.com/invite/greatape',
      Medium: 'https://medium.com/great-ape',
      Twitter: 'https://twitter.com/grapeprotocol',
      Twitch: 'https://www.twitch.tv/whalesfriend',
    },
    tags: ['raydium'],
  },
  CHEEMS: {
    symbol: 'CHEEMS',
    name: 'CHEEMS',
    mintAddress: '3FoUAsGDbvTD6YZ4wVKJgTB76onJUKz7GPEBNiR5b8wc',
    decimals: 4,
    referrer: '',
    tags: ['raydium'],
  },
  stSOL: {
    symbol: 'stSOL',
    name: 'stSOL',
    mintAddress: '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj',
    decimals: 9,
    referrer: '8Mq4Tugv1fcT4gb1wf5ChdEFmdqNGKxFVCnM9TVe44vD',
    tags: ['raydium'],
  },
};

const LP_TOKENS = {
  'RAY-WUSDT': {
    symbol: 'RAY-WUSDT',
    name: 'RAY-WUSDT V2 LP',
    coin: {...TOKENS.RAY},
    pc: {...TOKENS.WUSDT},

    mintAddress: 'CzPDyvotTcxNqtPne32yUiEVQ6jk42HZi1Y3hUu7qf7f',
    decimals: TOKENS.RAY.decimals,
  },
  'RAY-SOL': {
    symbol: 'RAY-SOL',
    name: 'RAY-SOL LP',
    coin: {...TOKENS.RAY},
    pc: {...NATIVE_SOL},

    mintAddress: '134Cct3CSdRCbYgq5SkwmHgfwjJ7EM5cG9PzqffWqECx',
    decimals: TOKENS.RAY.decimals,
  },
  'LINK-WUSDT': {
    symbol: 'LINK-WUSDT',
    name: 'LINK-WUSDT LP',
    coin: {...TOKENS.LINK},
    pc: {...TOKENS.WUSDT},

    mintAddress: 'EVDmwajM5U73PD34bYPugwiA4Eqqbrej4mLXXv15Z5qR',
    decimals: TOKENS.LINK.decimals,
  },
  'ETH-WUSDT': {
    symbol: 'ETH-WUSDT',
    name: 'ETH-WUSDT LP',
    coin: {...TOKENS.ETH},
    pc: {...TOKENS.WUSDT},

    mintAddress: 'KY4XvwHy7JPzbWYAbk23jQvEb4qWJ8aCqYWREmk1Q7K',
    decimals: TOKENS.ETH.decimals,
  },
  'RAY-USDC': {
    symbol: 'RAY-USDC',
    name: 'RAY-USDC V2 LP',
    coin: {...TOKENS.RAY},
    pc: {...TOKENS.USDC},

    mintAddress: 'FgmBnsF5Qrnv8X9bomQfEtQTQjNNiBCWRKGpzPnE5BDg',
    decimals: TOKENS.RAY.decimals,
  },
  'RAY-SRM': {
    symbol: 'RAY-SRM',
    name: 'RAY-SRM V2 LP',
    coin: {...TOKENS.RAY},
    pc: {...TOKENS.SRM},

    mintAddress: '5QXBMXuCL7zfAk39jEVVEvcrz1AvBGgT9wAhLLHLyyUJ',
    decimals: TOKENS.RAY.decimals,
  },
  // v3
  'RAY-WUSDT-V3': {
    symbol: 'RAY-WUSDT',
    name: 'RAY-WUSDT V3 LP',
    coin: {...TOKENS.RAY},
    pc: {...TOKENS.WUSDT},

    mintAddress: 'FdhKXYjCou2jQfgKWcNY7jb8F2DPLU1teTTTRfLBD2v1',
    decimals: TOKENS.RAY.decimals,
  },
  'RAY-USDC-V3': {
    symbol: 'RAY-USDC',
    name: 'RAY-USDC V3 LP',
    coin: {...TOKENS.RAY},
    pc: {...TOKENS.USDC},

    mintAddress: 'BZFGfXMrjG2sS7QT2eiCDEevPFnkYYF7kzJpWfYxPbcx',
    decimals: TOKENS.RAY.decimals,
  },
  'RAY-SRM-V3': {
    symbol: 'RAY-SRM',
    name: 'RAY-SRM V3 LP',
    coin: {...TOKENS.RAY},
    pc: {...TOKENS.SRM},

    mintAddress: 'DSX5E21RE9FB9hM8Nh8xcXQfPK6SzRaJiywemHBSsfup',
    decimals: TOKENS.RAY.decimals,
  },
  'RAY-SOL-V3': {
    symbol: 'RAY-SOL',
    name: 'RAY-SOL V3 LP',
    coin: {...TOKENS.RAY},
    pc: {...NATIVE_SOL},

    mintAddress: 'F5PPQHGcznZ2FxD9JaxJMXaf7XkaFFJ6zzTBcW8osQjw',
    decimals: TOKENS.RAY.decimals,
  },
  'RAY-ETH-V3': {
    symbol: 'RAY-ETH',
    name: 'RAY-ETH V3 LP',
    coin: {...TOKENS.RAY},
    pc: {...TOKENS.ETH},

    mintAddress: '8Q6MKy5Yxb9vG1mWzppMtMb2nrhNuCRNUkJTeiE3fuwD',
    decimals: TOKENS.RAY.decimals,
  },
  // v4
  'FIDA-RAY-V4': {
    symbol: 'FIDA-RAY',
    name: 'FIDA-RAY LP',
    coin: {...TOKENS.FIDA},
    pc: {...TOKENS.RAY},

    mintAddress: 'DsBuznXRTmzvEdb36Dx3aVLVo1XmH7r1PRZUFugLPTFv',
    decimals: TOKENS.FIDA.decimals,
  },
  'OXY-RAY-V4': {
    symbol: 'OXY-RAY',
    name: 'OXY-RAY LP',
    coin: {...TOKENS.OXY},
    pc: {...TOKENS.RAY},

    mintAddress: 'FwaX9W7iThTZH5MFeasxdLpxTVxRcM7ZHieTCnYog8Yb',
    decimals: TOKENS.OXY.decimals,
  },
  'MAPS-RAY-V4': {
    symbol: 'MAPS-RAY',
    name: 'MAPS-RAY LP',
    coin: {...TOKENS.MAPS},
    pc: {...TOKENS.RAY},

    mintAddress: 'CcKK8srfVdTSsFGV3VLBb2YDbzF4T4NM2C3UEjC39RLP',
    decimals: TOKENS.MAPS.decimals,
  },
  'KIN-RAY-V4': {
    symbol: 'KIN-RAY',
    name: 'KIN-RAY LP',
    coin: {...TOKENS.KIN},
    pc: {...TOKENS.RAY},

    mintAddress: 'CHT8sft3h3gpLYbCcZ9o27mT5s3Z6VifBVbUiDvprHPW',
    decimals: 6,
  },
  'RAY-USDT-V4': {
    symbol: 'RAY-USDT',
    name: 'RAY-USDT LP',
    coin: {...TOKENS.RAY},
    pc: {...TOKENS.USDT},

    mintAddress: 'C3sT1R3nsw4AVdepvLTLKr5Gvszr7jufyBWUCvy4TUvT',
    decimals: TOKENS.RAY.decimals,
  },
  'SOL-USDC-V4': {
    symbol: 'SOL-USDC',
    name: 'SOL-USDC LP',
    coin: {...NATIVE_SOL},
    pc: {...TOKENS.USDC},

    mintAddress: '8HoQnePLqPj4M7PUDzfw8e3Ymdwgc7NLGnaTUapubyvu',
    decimals: NATIVE_SOL.decimals,
  },
  'YFI-USDC-V4': {
    symbol: 'YFI-USDC',
    name: 'YFI-USDC LP',
    coin: {...TOKENS.YFI},
    pc: {...TOKENS.USDC},

    mintAddress: '865j7iMmRRycSYUXzJ33ZcvLiX9JHvaLidasCyUyKaRE',
    decimals: TOKENS.YFI.decimals,
  },
  'SRM-USDC-V4': {
    symbol: 'SRM-USDC',
    name: 'SRM-USDC LP',
    coin: {...TOKENS.SRM},
    pc: {...TOKENS.USDC},

    mintAddress: '9XnZd82j34KxNLgQfz29jGbYdxsYznTWRpvZE3SRE7JG',
    decimals: TOKENS.SRM.decimals,
  },
  'FTT-USDC-V4': {
    symbol: 'FTT-USDC',
    name: 'FTT-USDC LP',
    coin: {...TOKENS.FTT},
    pc: {...TOKENS.USDC},

    mintAddress: '75dCoKfUHLUuZ4qEh46ovsxfgWhB4icc3SintzWRedT9',
    decimals: TOKENS.FTT.decimals,
  },
  'BTC-USDC-V4': {
    symbol: 'BTC-USDC',
    name: 'BTC-USDC LP',
    coin: {...TOKENS.BTC},
    pc: {...TOKENS.USDC},

    mintAddress: '2hMdRdVWZqetQsaHG8kQjdZinEMBz75vsoWTCob1ijXu',
    decimals: TOKENS.BTC.decimals,
  },
  'SUSHI-USDC-V4': {
    symbol: 'SUSHI-USDC',
    name: 'SUSHI-USDC LP',
    coin: {...TOKENS.SUSHI},
    pc: {...TOKENS.USDC},

    mintAddress: '2QVjeR9d2PbSf8em8NE8zWd8RYHjFtucDUdDgdbDD2h2',
    decimals: TOKENS.SUSHI.decimals,
  },
  'TOMO-USDC-V4': {
    symbol: 'TOMO-USDC',
    name: 'TOMO-USDC LP',
    coin: {...TOKENS.TOMO},
    pc: {...TOKENS.USDC},

    mintAddress: 'CHyUpQFeW456zcr5XEh4RZiibH8Dzocs6Wbgz9aWpXnQ',
    decimals: TOKENS.TOMO.decimals,
  },
  'LINK-USDC-V4': {
    symbol: 'LINK-USDC',
    name: 'LINK-USDC LP',
    coin: {...TOKENS.LINK},
    pc: {...TOKENS.USDC},

    mintAddress: 'BqjoYjqKrXtfBKXeaWeAT5sYCy7wsAYf3XjgDWsHSBRs',
    decimals: TOKENS.LINK.decimals,
  },
  'ETH-USDC-V4': {
    symbol: 'ETH-USDC',
    name: 'ETH-USDC LP',
    coin: {...TOKENS.ETH},
    pc: {...TOKENS.USDC},

    mintAddress: '13PoKid6cZop4sj2GfoBeujnGfthUbTERdE5tpLCDLEY',
    decimals: TOKENS.ETH.decimals,
  },
  'xCOPE-USDC-V4': {
    symbol: 'xCOPE-USDC',
    name: 'xCOPE-USDC LP',
    coin: {...TOKENS.xCOPE},
    pc: {...TOKENS.USDC},

    mintAddress: '2Vyyeuyd15Gp8aH6uKE72c4hxc8TVSLibxDP9vzspQWG',
    decimals: TOKENS.xCOPE.decimals,
  },
  'SOL-USDT-V4': {
    symbol: 'SOL-USDT',
    name: 'SOL-USDT LP',
    coin: {...NATIVE_SOL},
    pc: {...TOKENS.USDT},

    mintAddress: 'Epm4KfTj4DMrvqn6Bwg2Tr2N8vhQuNbuK8bESFp4k33K',
    decimals: NATIVE_SOL.decimals,
  },
  'YFI-USDT-V4': {
    symbol: 'YFI-USDT',
    name: 'YFI-USDT LP',
    coin: {...TOKENS.YFI},
    pc: {...TOKENS.USDT},

    mintAddress: 'FA1i7fej1pAbQbnY8NbyYUsTrWcasTyipKreDgy1Mgku',
    decimals: TOKENS.YFI.decimals,
  },
  'SRM-USDT-V4': {
    symbol: 'SRM-USDT',
    name: 'SRM-USDT LP',
    coin: {...TOKENS.SRM},
    pc: {...TOKENS.USDT},

    mintAddress: 'HYSAu42BFejBS77jZAZdNAWa3iVcbSRJSzp3wtqCbWwv',
    decimals: TOKENS.SRM.decimals,
  },
  'FTT-USDT-V4': {
    symbol: 'FTT-USDT',
    name: 'FTT-USDT LP',
    coin: {...TOKENS.FTT},
    pc: {...TOKENS.USDT},

    mintAddress: '2cTCiUnect5Lap2sk19xLby7aajNDYseFhC9Pigou11z',
    decimals: TOKENS.FTT.decimals,
  },
  'BTC-USDT-V4': {
    symbol: 'BTC-USDT',
    name: 'BTC-USDT LP',
    coin: {...TOKENS.BTC},
    pc: {...TOKENS.USDT},

    mintAddress: 'DgGuvR9GSHimopo3Gc7gfkbKamLKrdyzWkq5yqA6LqYS',
    decimals: TOKENS.BTC.decimals,
  },
  'SUSHI-USDT-V4': {
    symbol: 'SUSHI-USDT',
    name: 'SUSHI-USDT LP',
    coin: {...TOKENS.SUSHI},
    pc: {...TOKENS.USDT},

    mintAddress: 'Ba26poEYDy6P2o95AJUsewXgZ8DM9BCsmnU9hmC9i4Ki',
    decimals: TOKENS.SUSHI.decimals,
  },
  'TOMO-USDT-V4': {
    symbol: 'TOMO-USDT',
    name: 'TOMO-USDT LP',
    coin: {...TOKENS.TOMO},
    pc: {...TOKENS.USDT},

    mintAddress: 'D3iGro1vn6PWJXo9QAPj3dfta6dKkHHnmiiym2EfsAmi',
    decimals: TOKENS.TOMO.decimals,
  },
  'LINK-USDT-V4': {
    symbol: 'LINK-USDT',
    name: 'LINK-USDT LP',
    coin: {...TOKENS.LINK},
    pc: {...TOKENS.USDT},

    mintAddress: 'Dr12Sgt9gkY8WU5tRkgZf1TkVWJbvjYuPAhR3aDCwiiX',
    decimals: TOKENS.LINK.decimals,
  },
  'ETH-USDT-V4': {
    symbol: 'ETH-USDT',
    name: 'ETH-USDT LP',
    coin: {...TOKENS.ETH},
    pc: {...TOKENS.USDT},

    mintAddress: 'nPrB78ETY8661fUgohpuVusNCZnedYCgghzRJzxWnVb',
    decimals: TOKENS.ETH.decimals,
  },
  'YFI-SRM-V4': {
    symbol: 'YFI-SRM',
    name: 'YFI-SRM LP',
    coin: {...TOKENS.YFI},
    pc: {...TOKENS.SRM},

    mintAddress: 'EGJht91R7dKpCj8wzALkjmNdUUUcQgodqWCYweyKcRcV',
    decimals: TOKENS.YFI.decimals,
  },
  'FTT-SRM-V4': {
    symbol: 'FTT-SRM',
    name: 'FTT-SRM LP',
    coin: {...TOKENS.FTT},
    pc: {...TOKENS.SRM},

    mintAddress: 'AsDuPg9MgPtt3jfoyctUCUgsvwqAN6RZPftqoeiPDefM',
    decimals: TOKENS.FTT.decimals,
  },
  'BTC-SRM-V4': {
    symbol: 'BTC-SRM',
    name: 'BTC-SRM LP',
    coin: {...TOKENS.BTC},
    pc: {...TOKENS.SRM},

    mintAddress: 'AGHQxXb3GSzeiLTcLtXMS2D5GGDZxsB2fZYZxSB5weqB',
    decimals: TOKENS.BTC.decimals,
  },
  'SUSHI-SRM-V4': {
    symbol: 'SUSHI-SRM',
    name: 'SUSHI-SRM LP',
    coin: {...TOKENS.SUSHI},
    pc: {...TOKENS.SRM},

    mintAddress: '3HYhUnUdV67j1vn8fu7ExuVGy5dJozHEyWvqEstDbWwE',
    decimals: TOKENS.SUSHI.decimals,
  },
  'TOMO-SRM-V4': {
    symbol: 'TOMO-SRM',
    name: 'TOMO-SRM LP',
    coin: {...TOKENS.TOMO},
    pc: {...TOKENS.SRM},

    mintAddress: 'GgH9RnKrQpaMQeqmdbMvs5oo1A24hERQ9wuY2pSkeG7x',
    decimals: TOKENS.TOMO.decimals,
  },
  'LINK-SRM-V4': {
    symbol: 'LINK-SRM',
    name: 'LINK-SRM LP',
    coin: {...TOKENS.LINK},
    pc: {...TOKENS.SRM},

    mintAddress: 'GXN6yJv12o18skTmJXaeFXZVY1iqR18CHsmCT8VVCmDD',
    decimals: TOKENS.LINK.decimals,
  },
  'ETH-SRM-V4': {
    symbol: 'ETH-SRM',
    name: 'ETH-SRM LP',
    coin: {...TOKENS.ETH},
    pc: {...TOKENS.SRM},

    mintAddress: '9VoY3VERETuc2FoadMSYYizF26mJinY514ZpEzkHMtwG',
    decimals: TOKENS.ETH.decimals,
  },
  'SRM-SOL-V4': {
    symbol: 'SRM-SOL',
    name: 'SRM-SOL LP',
    coin: {...TOKENS.SRM},
    pc: {...NATIVE_SOL},

    mintAddress: 'AKJHspCwDhABucCxNLXUSfEzb7Ny62RqFtC9uNjJi4fq',
    decimals: TOKENS.SRM.decimals,
  },
  'STEP-USDC-V4': {
    symbol: 'STEP-USDC',
    name: 'STEP-USDC LP',
    coin: {...TOKENS.STEP},
    pc: {...TOKENS.USDC},

    mintAddress: '3k8BDobgihmk72jVmXYLE168bxxQUhqqyESW4dQVktqC',
    decimals: TOKENS.STEP.decimals,
  },
  'MEDIA-USDC-V4': {
    symbol: 'MEDIA-USDC',
    name: 'MEDIA-USDC LP',
    coin: {...TOKENS.MEDIA},
    pc: {...TOKENS.USDC},

    mintAddress: 'A5zanvgtioZGiJMdEyaKN4XQmJsp1p7uVxaq2696REvQ',
    decimals: TOKENS.MEDIA.decimals,
  },
  'ROPE-USDC-V4': {
    symbol: 'ROPE-USDC',
    name: 'ROPE-USDC LP',
    coin: {...TOKENS.ROPE},
    pc: {...TOKENS.USDC},

    mintAddress: 'Cq4HyW5xia37tKejPF2XfZeXQoPYW6KfbPvxvw5eRoUE',
    decimals: TOKENS.ROPE.decimals,
  },
  'MER-USDC-V4': {
    symbol: 'MER-USDC',
    name: 'MER-USDC LP',
    coin: {...TOKENS.MER},
    pc: {...TOKENS.USDC},

    mintAddress: '3H9NxvaZoxMZZDZcbBDdWMKbrfNj7PCF5sbRwDr7SdDW',
    decimals: TOKENS.MER.decimals,
  },
  'COPE-USDC-V4': {
    symbol: 'COPE-USDC',
    name: 'COPE-USDC LP',
    coin: {...TOKENS.COPE},
    pc: {...TOKENS.USDC},

    mintAddress: 'Cz1kUvHw98imKkrqqu95GQB9h1frY8RikxPojMwWKGXf',
    decimals: TOKENS.COPE.decimals,
  },
  'ALEPH-USDC-V4': {
    symbol: 'ALEPH-USDC',
    name: 'ALEPH-USDC LP',
    coin: {...TOKENS.ALEPH},
    pc: {...TOKENS.USDC},

    mintAddress: 'iUDasAP2nXm5wvTukAHEKSdSXn8vQkRtaiShs9ceGB7',
    decimals: TOKENS.ALEPH.decimals,
  },
  'TULIP-USDC-V4': {
    symbol: 'TULIP-USDC',
    name: 'TULIP-USDC LP',
    coin: {...TOKENS.TULIP},
    pc: {...TOKENS.USDC},

    mintAddress: '2doeZGLJyACtaG9DCUyqMLtswesfje1hjNA11hMdj6YU',
    decimals: TOKENS.TULIP.decimals,
  },
  'WOO-USDC-V4': {
    symbol: 'WOO-USDC',
    name: 'WOO-USDC LP',
    coin: {...TOKENS.WOO},
    pc: {...TOKENS.USDC},

    mintAddress: '7cu42ao8Jgrd5A3y3bNQsCxq5poyGZNmTydkGfJYQfzh',
    decimals: TOKENS.WOO.decimals,
  },
  'SNY-USDC-V4': {
    symbol: 'SNY-USDC',
    name: 'SNY-USDC LP',
    coin: {...TOKENS.SNY},
    pc: {...TOKENS.USDC},

    mintAddress: 'G8qcfeFqxwbCqpxv5LpLWxUCd1PyMB5nWb5e5YyxLMKg',
    decimals: TOKENS.SNY.decimals,
  },
  'BOP-RAY-V4': {
    symbol: 'BOP-RAY',
    name: 'BOP-RAY LP',
    coin: {...TOKENS.BOP},
    pc: {...TOKENS.RAY},

    mintAddress: '9nQPYJvysyfnXhQ6nkK5V7sZG26hmDgusfdNQijRk5LD',
    decimals: TOKENS.BOP.decimals,
  },
  'SLRS-USDC-V4': {
    symbol: 'SLRS-USDC',
    name: 'SLRS-USDC LP',
    coin: {...TOKENS.SLRS},
    pc: {...TOKENS.USDC},

    mintAddress: '2Xxbm1hdv5wPeen5ponDSMT3VqhGMTQ7mH9stNXm9shU',
    decimals: TOKENS.SLRS.decimals,
  },
  'SAMO-RAY-V4': {
    symbol: 'SAMO-RAY',
    name: 'SAMO-RAY LP',
    coin: {...TOKENS.SAMO},
    pc: {...TOKENS.RAY},

    mintAddress: 'HwzkXyX8B45LsaHXwY8su92NoRBS5GQC32HzjQRDqPnr',
    decimals: TOKENS.SAMO.decimals,
  },
  'renBTC-USDC-V4': {
    symbol: 'renBTC-USDC',
    name: 'renBTC-USDC LP',
    coin: {...TOKENS.renBTC},
    pc: {...TOKENS.USDC},

    mintAddress: 'CTEpsih91ZLo5gunvryLpJ3pzMjmt5jbS6AnSQrzYw7V',
    decimals: TOKENS.renBTC.decimals,
  },
  'renDOGE-USDC-V4': {
    symbol: 'renDOGE-USDC',
    name: 'renDOGE-USDC LP',
    coin: {...TOKENS.renDOGE},
    pc: {...TOKENS.USDC},

    mintAddress: 'Hb8KnZNKvRxu7pgMRWJgoMSMcepfvNiBFFDDrdf9o3wA',
    decimals: TOKENS.renDOGE.decimals,
  },
  'RAY-USDC-V4': {
    symbol: 'RAY-USDC',
    name: 'RAY-USDC LP',
    coin: {...TOKENS.RAY},
    pc: {...TOKENS.USDC},

    mintAddress: 'FbC6K13MzHvN42bXrtGaWsvZY9fxrackRSZcBGfjPc7m',
    decimals: TOKENS.RAY.decimals,
  },
  'RAY-SRM-V4': {
    symbol: 'RAY-SRM',
    name: 'RAY-SRM LP',
    coin: {...TOKENS.RAY},
    pc: {...TOKENS.SRM},

    mintAddress: '7P5Thr9Egi2rvMmEuQkLn8x8e8Qro7u2U7yLD2tU2Hbe',
    decimals: TOKENS.RAY.decimals,
  },
  'RAY-ETH-V4': {
    symbol: 'RAY-ETH',
    name: 'RAY-ETH LP',
    coin: {...TOKENS.RAY},
    pc: {...TOKENS.ETH},

    mintAddress: 'mjQH33MqZv5aKAbKHi8dG3g3qXeRQqq1GFcXceZkNSr',
    decimals: TOKENS.RAY.decimals,
  },
  'RAY-SOL-V4': {
    symbol: 'RAY-SOL',
    name: 'RAY-SOL LP',
    coin: {...TOKENS.RAY},
    pc: {...NATIVE_SOL},

    mintAddress: '89ZKE4aoyfLBe2RuV6jM3JGNhaV18Nxh8eNtjRcndBip',
    decimals: TOKENS.RAY.decimals,
  },
  'DXL-USDC-V4': {
    symbol: 'DXL-USDC',
    name: 'DXL-USDC LP',
    coin: {...TOKENS.DXL},
    pc: {...TOKENS.USDC},

    mintAddress: '4HFaSvfgskipvrzT1exoVKsUZ174JyExEsA8bDfsAdY5',
    decimals: TOKENS.DXL.decimals,
  },
  'LIKE-USDC-V4': {
    symbol: 'LIKE-USDC',
    name: 'LIKE-USDC LP',
    coin: {...TOKENS.LIKE},
    pc: {...TOKENS.USDC},

    mintAddress: 'cjZmbt8sJgaoyWYUttomAu5LJYU44ZrcKTbzTSEPDVw',
    decimals: TOKENS.LIKE.decimals,
  },
  'mSOL-USDC-V4': {
    symbol: 'mSOL-USDC',
    name: 'mSOL-USDC LP',
    coin: {...TOKENS.mSOL},
    pc: {...TOKENS.USDC},

    mintAddress: '4xTpJ4p76bAeggXoYywpCCNKfJspbuRzZ79R7pRhbqSf',
    decimals: TOKENS.mSOL.decimals,
  },
  'mSOL-SOL-V4': {
    symbol: 'mSOL-SOL',
    name: 'mSOL-SOL LP',
    coin: {...TOKENS.mSOL},
    pc: {...NATIVE_SOL},

    mintAddress: '5ijRoAHVgd5T5CNtK5KDRUBZ7Bffb69nktMj5n6ks6m4',
    decimals: TOKENS.mSOL.decimals,
  },
  'MER-PAI-V4': {
    symbol: 'MER-PAI',
    name: 'MER-PAI LP',
    coin: {...TOKENS.MER},
    pc: {...TOKENS.PAI},

    mintAddress: 'DU5RT2D9EviaSmX6Ta8MZwMm85HwSEqGMRdqUiuCGfmD',
    decimals: TOKENS.MER.decimals,
  },
  'PORT-USDC-V4': {
    symbol: 'PORT-USDC',
    name: 'PORT-USDC LP',
    coin: {...TOKENS.PORT},
    pc: {...TOKENS.USDC},

    mintAddress: '9tmNtbUCrLS15qC4tEfr5NNeqcqpZ4uiGgi2vS5CLQBS',
    decimals: TOKENS.PORT.decimals,
  },
  'MNGO-USDC-V4': {
    symbol: 'MNGO-USDC',
    name: 'MNGO-USDC LP',
    coin: {...TOKENS.MNGO},
    pc: {...TOKENS.USDC},

    mintAddress: 'DkiqCQ792n743xjWQVCbBUaVtkdiuvQeYndM53ReWnCC',
    decimals: TOKENS.MNGO.decimals,
  },
  'ATLAS-USDC-V4': {
    symbol: 'ATLAS-USDC',
    name: 'ATLAS-USDC LP',
    coin: {...TOKENS.ATLAS},
    pc: {...TOKENS.USDC},

    mintAddress: '9shGU9f1EsxAbiR567MYZ78WUiS6ZNCYbHe53WUULQ7n',
    decimals: TOKENS.ATLAS.decimals,
  },
  'POLIS-USDC-V4': {
    symbol: 'POLIS-USDC',
    name: 'POLIS-USDC LP',
    coin: {...TOKENS.POLIS},
    pc: {...TOKENS.USDC},

    mintAddress: '8MbKSBpyXs8fVneKgt71jfHrn5SWtX8n4wMLpiVfF9So',
    decimals: TOKENS.POLIS.decimals,
  },
  'ATLAS-RAY-V4': {
    symbol: 'ATLAS-RAY',
    name: 'ATLAS-RAY LP',
    coin: {...TOKENS.ATLAS},
    pc: {...TOKENS.RAY},

    mintAddress: '418MFhkaYQtbn529wmjLLqL6uKxDz7j4eZBaV1cobkyd',
    decimals: TOKENS.ATLAS.decimals,
  },
  'POLIS-RAY-V4': {
    symbol: 'POLIS-RAY',
    name: 'POLIS-RAY LP',
    coin: {...TOKENS.POLIS},
    pc: {...TOKENS.RAY},

    mintAddress: '9ysGKUH6WqzjQEUT4dxqYCUaFNVK9QFEa24pGzjFq8xg',
    decimals: TOKENS.POLIS.decimals,
  },
  'ALEPH-RAY-V4': {
    symbol: 'ALEPH-RAY',
    name: 'ALEPH-RAY LP',
    coin: {...TOKENS.ALEPH},
    pc: {...TOKENS.RAY},

    mintAddress: 'n76skjqv4LirhdLok2zJELXNLdRpYDgVJQuQFbamscy',
    decimals: TOKENS.ALEPH.decimals,
  },
  'TULIP-RAY-V4': {
    symbol: 'TULIP-RAY',
    name: 'TULIP-RAY LP',
    coin: {...TOKENS.TULIP},
    pc: {...TOKENS.RAY},

    mintAddress: '3AZTviji5qduMG2s4FfWGR3SSQmNUCyx8ao6UKCPg3oJ',
    decimals: TOKENS.TULIP.decimals,
  },
  'SLRS-RAY-V4': {
    symbol: 'SLRS-RAY',
    name: 'SLRS-RAY LP',
    coin: {...TOKENS.SLRS},
    pc: {...TOKENS.RAY},

    mintAddress: '2pk78vsKT3jfJAcN2zbpMUnrR57SZrxHqaZYyFgp92mM',
    decimals: TOKENS.SLRS.decimals,
  },
  'MER-RAY-V4': {
    symbol: 'MER-RAY',
    name: 'MER-RAY LP',
    coin: {...TOKENS.MER},
    pc: {...TOKENS.RAY},

    mintAddress: '214hxy3AbKoaEKgqcg2aC1cP5R67cGGAyDEg5GDwC7Ub',
    decimals: TOKENS.MER.decimals,
  },
  'MEDIA-RAY-V4': {
    symbol: 'MEDIA-RAY',
    name: 'MEDIA-RAY LP',
    coin: {...TOKENS.MEDIA},
    pc: {...TOKENS.RAY},

    mintAddress: '9Aseg5A1JD1yCiFFdDaNNxCiJ7XzrpZFmcEmLjXFdPaH',
    decimals: TOKENS.MEDIA.decimals,
  },
  'SNY-RAY-V4': {
    symbol: 'SNY-RAY',
    name: 'SNY-RAY LP',
    coin: {...TOKENS.SNY},
    pc: {...TOKENS.RAY},

    mintAddress: '2k4quTuuLUxrSEhFH99qcoZzvgvVEc3b5sz3xz3qstfS',
    decimals: TOKENS.SNY.decimals,
  },
  'LIKE-RAY-V4': {
    symbol: 'LIKE-RAY',
    name: 'LIKE-RAY LP',
    coin: {...TOKENS.LIKE},
    pc: {...TOKENS.RAY},

    mintAddress: '7xqDycbFSCpUpzkYapFeyPJWPwEpV7zdWbYf2MVHTNjv',
    decimals: TOKENS.LIKE.decimals,
  },
  'COPE-RAY-V4': {
    symbol: 'COPE-RAY',
    name: 'COPE-RAY LP',
    coin: {...TOKENS.COPE},
    pc: {...TOKENS.RAY},

    mintAddress: 'A7GCVHA8NSsbdFscHdoNU41tL1TRKNmCH4K94CgcLK9F',
    decimals: TOKENS.COPE.decimals,
  },
  'ETH-SOL-V4': {
    symbol: 'ETH-SOL',
    name: 'ETH-SOL LP',
    coin: {...TOKENS.ETH},
    pc: {...NATIVE_SOL},

    mintAddress: 'GKfgC86iJoMjwAtcyiLu6nWnjggqUXsDQihXkP14fDez',
    decimals: TOKENS.ETH.decimals,
  },
  'stSOL-USDC-V4': {
    symbol: 'stSOL-USDC',
    name: 'stSOL-USDC LP',
    coin: {...TOKENS.stSOL},
    pc: {...TOKENS.USDC},

    mintAddress: 'HDUJMwYZkjUZre63xUeDhdCi8c6LgUDiBqxmP3QC3VPX',
    decimals: TOKENS.stSOL.decimals,
  },
  'GRAPE-USDC-V4': {
    symbol: 'GRAPE-USDC',
    name: 'GRAPE-USDC LP',
    coin: {...TOKENS.GRAPE},
    pc: {...TOKENS.USDC},

    mintAddress: 'A8ZYmnZ1vwxUa4wpJVUaJgegsuTEz5TKy5CiJXffvmpt',
    decimals: TOKENS.GRAPE.decimals,
  },
};

const FARMS = [
  // v3 farm
  {
    name: 'RAY-USDC',
    lp: {...LP_TOKENS['RAY-USDC-V3']},
    reward: {...TOKENS.RAY},
    isStake: false,

    fusion: false,
    legacy: true,
    dual: false,
    version: 3,
    programId: STAKE_PROGRAM_ID,

    poolId: '8nEWqxeDNZ2yo1izbPzY4nwR55isBZRaQk7CM8ntwUwR',
    poolAuthority: '6vQGZLsHgpJdqh1ER7q2q6mjZ43QwzhtTofTzb2sUhNh',
    poolLpTokenAccount: '77ujS15hjUfFZkM8QAw4HMLvMGZg95Gcm6ixjA1bnk3M', // lp vault
    poolRewardTokenAccount: '3ejmkn5HpXR9KdVWkai1Ngo87sQSUyKXrx8wSakipkno', // reward vault
  },
  {
    name: 'RAY-SRM',
    lp: {...LP_TOKENS['RAY-SRM-V3']},
    reward: {...TOKENS.RAY},
    isStake: false,

    fusion: false,
    legacy: true,
    dual: false,
    version: 3,
    programId: STAKE_PROGRAM_ID,

    poolId: 'HwEgvS79S53yzYUTRHShU6EuNmhR3WTX5tTZPUzBmwky',
    poolAuthority: '9B3XWm89zX7NwaBB8VmT5mrWvxVpd9eyfQMeqkuLkcCF',
    poolLpTokenAccount: 'F4zXXzqkyT1GP5CVdEgC7qTcDfR8ox5Akm6RCbBdBsRp', // lp vault
    poolRewardTokenAccount: 'FW7omPaCCvgBgUFKwvwU2jf1w1wJGjDrJqurr3SeXn14', // reward vault
  },
  {
    name: 'RAY-SOL',
    lp: {...LP_TOKENS['RAY-SOL-V3']},
    reward: {...TOKENS.RAY},
    isStake: false,

    fusion: false,
    legacy: true,
    dual: false,
    version: 3,
    programId: STAKE_PROGRAM_ID,

    poolId: 'ECqG3sxwJiq9TTYsRBd7fPGsBKYF4fyogo6Df7c13qdJ',
    poolAuthority: '4Wf4om12g9xzEeeD139ffCuXn4W2huMcXziiSAzf7Nig',
    poolLpTokenAccount: '9kWnkQtMAW2bzKeLQsTdan1rEoypDHaAVnZRcoBPDBfQ', // lp vault
    poolRewardTokenAccount: '8z4kQbgQFe4zXE4NSozWJTJV14gD4evNq4CKn5ryB6S3', // reward vault
  },
  {
    name: 'RAY-ETH',
    lp: {...LP_TOKENS['RAY-ETH-V3']},
    reward: {...TOKENS.RAY},
    isStake: false,

    fusion: false,
    legacy: true,
    dual: false,
    version: 3,
    programId: STAKE_PROGRAM_ID,

    poolId: 'CYKDTwojSLVFEShB3tcTTfMjtBxUNtYfCTM4PiMFGkio',
    poolAuthority: 'Azmucec2jdgWagFkbnqmwYcsrtKPf1v1kcM95v6s1zxu',
    poolLpTokenAccount: 'EncPBQhpc5KLmcgRD2PutQz7wBBNQkVN2s8jjFWEw9no', // lp vault
    poolRewardTokenAccount: '8q8BHw7fP7mitLrb2jzw78qcSEgCvM7GTB5PzbSQobUt', // reward vault
  },
  // v3
  {
    name: 'RAY-WUSDT',
    lp: {...LP_TOKENS['RAY-WUSDT-V3']},
    reward: {...TOKENS.RAY},
    isStake: false,

    fusion: false,
    legacy: true,
    dual: false,
    version: 3,
    programId: STAKE_PROGRAM_ID,

    poolId: '6d3vDYvk6VFVacEAGA1NDyxkQPRiNxXQRkeKpTPMJwe4',
    poolAuthority: 'EcPc2KUDFMyPNAVPE6PsMkzneBFKNqRjUhfhyM2da9go',
    poolLpTokenAccount: 'Gx4kLpTirc3Lr3GEYojYt1zUmsCcWajjBZTFVA3tzyDg', // lp vault
    poolRewardTokenAccount: 'J144vsbPdLa9V6JpvGFH63bQw8QhQckUNe48YjPKwcZo', // reward vault
  },
  {
    name: 'RAY-USDT',
    lp: {...LP_TOKENS['RAY-USDT-V4']},
    reward: {...TOKENS.RAY},
    isStake: false,

    fusion: false,
    legacy: false,
    dual: false,
    version: 3,
    programId: STAKE_PROGRAM_ID,

    poolId: 'AvbVWpBi2e4C9HPmZgShGdPoNydG4Yw8GJvG9HUcLgce',
    poolAuthority: '8JYVFy3pYsPSpPRsqf43KSJFnJzn83nnRLQgG88XKB8q',
    poolLpTokenAccount: '4u4AnMBHXehdpP5tbD6qzB5Q4iZmvKKR5aUr2gavG7aw', // lp vault
    poolRewardTokenAccount: 'HCHNuGzkqSnw9TbwpPv1gTnoqnqYepcojHw9DAToBrUj', // reward vault
  },
  // v2
  {
    name: 'RAY-WUSDT',
    lp: {...LP_TOKENS['RAY-WUSDT']},
    reward: {...TOKENS.RAY},
    isStake: false,

    fusion: false,
    legacy: true,
    dual: false,
    version: 2,
    programId: STAKE_PROGRAM_ID,

    poolId: '5w3itB5PVAPAiPFpBcMyGZJWukmcuRtwFRkQJF3WzHdj',
    poolAuthority: '4qgEHMtCAA4Z3rY4C1ihz9JHETHFhQVqj81Q1qyB83WP',
    poolLpTokenAccount: 'n1gotGPqeUxJnA4yE7QCCsNG8AVqQ1HuATkAhAfVMVV', // lp vault
    poolRewardTokenAccount: 'h8uQ293dPdJd7qFRFE1pvMbpFmxrtD64QaxUWwis4Wv', // reward vault
  },
  {
    name: 'RAY-USDC',
    lp: {...LP_TOKENS['RAY-USDC']},
    reward: {...TOKENS.RAY},
    isStake: false,

    fusion: false,
    legacy: true,
    dual: false,
    version: 2,
    programId: STAKE_PROGRAM_ID,

    poolId: '3j7qWosyu3cVNgbwdWRxEf4SxJKNWoWqgpAEn4RLpMrR',
    poolAuthority: 'BZhcMxjRy9oXSgghLN52uhsML5ooXS377yTJhkw96bYX',
    poolLpTokenAccount: '6qsk4PmATtiu132YJuUgVt4zekbTYV3xRZWxoc1rAg9U', // lp vault
    poolRewardTokenAccount: 'Aucgi2G2ufXTGGYf2ng3ZyQXLu6RH6ioL1R7mGfhUcbQ', // reward vault
  },
  {
    name: 'RAY-SRM',
    lp: {...LP_TOKENS['RAY-SRM']},
    reward: {...TOKENS.RAY},
    isStake: false,

    fusion: false,
    legacy: true,
    dual: false,
    version: 2,
    programId: STAKE_PROGRAM_ID,

    poolId: 'GLQwyMF1txnAdEnoYuPTPsWdXqUuxgTMsWEV38njk48C',
    poolAuthority: '5ddsMftKDoaT5qHnHKnfkGCexJhiaNz1E4mMagy6qMku',
    poolLpTokenAccount: 'HFYPGyBW5hsQnrtQntg4d6Gzyg6iaehVTAVNqQ6f5f28', // lp vault
    poolRewardTokenAccount: 'ETwFtP1dYCbvbARNPfKuJFxoGFDTTsqB6j3pRquPE7Fq', // reward vault
  },
  // stake
  {
    name: 'RAY',
    lp: {...TOKENS.RAY},
    reward: {...TOKENS.RAY},
    isStake: true,

    fusion: false,
    legacy: false,
    dual: false,
    version: 2,
    programId: STAKE_PROGRAM_ID,

    poolId: '4EwbZo8BZXP5313z5A2H11MRBP15M5n6YxfmkjXESKAW',
    poolAuthority: '4qD717qKoj3Sm8YfHMSR7tSKjWn5An817nArA6nGdcUR',
    poolLpTokenAccount: '8tnpAECxAT9nHBqR1Ba494Ar5dQMPGhL31MmPJz1zZvY', // lp vault
    poolRewardTokenAccount: 'BihEG2r7hYax6EherbRmuLLrySBuSXx4PYGd9gAsktKY', // reward vault
  },
  // Reward double
  {
    name: 'FIDA-RAY',
    lp: {...LP_TOKENS['FIDA-RAY-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.FIDA},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: true,
    version: 4,
    programId: STAKE_PROGRAM_ID_V4,

    poolId: '8rAdapvcC5vYNLXzChMgt56s6HCQGE6Lbo469g3WRTUh',
    poolAuthority: 'EcCKf3mgPtL6dNNAVG4gQQtLkAoTAUdf5vzFukkrviWq',
    poolLpTokenAccount: 'H6kzwNNg9zbgC1YBjvCN4BdebtA4NusvgUhUSDZoz8rP', // lp vault
    poolRewardTokenAccount: '7vnPTB2HAXFUAV5iiVZTNHgAnVYjgXcdumbbqfeK6ugp', // reward vault A
    poolRewardTokenAccountB: 'EGHdQm9KGLz6nw7W4rK13DyAMMJcGP9RpzCJaXiq75kQ', // reward vault B
  },
  {
    name: 'OXY-RAY',
    lp: {...LP_TOKENS['OXY-RAY-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.OXY},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: true,
    version: 4,
    programId: STAKE_PROGRAM_ID_V4,

    poolId: '7Hug9fKfTrasG3hHonXTfSnvv37mDeyoBHbVwyDjw693',
    poolAuthority: 'CcD7KXVhjoeFpbkXeBgPpZChafEfTZ4zJL47LqmKdqwz',
    poolLpTokenAccount: 'GtXoFnVRATaasBP6sroNaC54uLQfVAwGXsfKzgFqNiUc', // lp vault
    poolRewardTokenAccount: 'GKC7BcGs1515CQx6hiK562u29dFQxBw8HWwJUxqi7xf1', // reward vault A
    poolRewardTokenAccountB: 'DXDjRiC7EUUh9cj93tgBtX2jRkmnwtCMEAQD9GrYK2f6', // reward vault B
  },
  {
    name: 'MAPS-RAY',
    lp: {...LP_TOKENS['MAPS-RAY-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.MAPS},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: true,
    version: 4,
    programId: STAKE_PROGRAM_ID_V4,

    poolId: 'Chb6atEWGmH2NitCqrCEMHB8uKWYQiiVaBnmJQDudm87',
    poolAuthority: 'BcmgQZXCDPCduv3reT8LDQNqvGeGMZtFhBxyLYdrnCjE',
    poolLpTokenAccount: '5uaBAwu1Sff58KNKGTwfacsjsrMU3wg6jtGtMWwiZd5B', // lp vault
    poolRewardTokenAccount: '4LVikvk3gZEHaTUNh7L8bsx5By6NNnkqpKfcdJTWTD7Z', // reward vault A
    poolRewardTokenAccountB: '3UWGpEe2NLD9oWPW1zdXGZRCvJxkNSC2puUWooNEugdS', // reward vault B
  },
  {
    name: 'KIN-RAY',
    lp: {...LP_TOKENS['KIN-RAY-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.KIN},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: true,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'FgApVk6mASrkuWNxmsFvsaAYkFKqdiwMTvYZK36A2DaC',
    poolAuthority: '7kEx8qnkZPkRXV6f4ztf27zYjCACBHY3PUMfuiYJsoML',
    poolLpTokenAccount: '7fgDjhZn9GqRZbbCregr9tpkbWSKjibdCsJNBYbLhLir', // lp vault
    poolRewardTokenAccount: '5XZjRyEo8Wr2CtSE5bpoKioThT9czK1dUebbK87Lqkaa', // reward vault A
    poolRewardTokenAccountB: '8jGJ3ST1j9eemfC6N2qQevtUdwxT7TpXW1NmvWyvLLVs', // reward vault B
  },
  {
    name: 'xCOPE-USDC',
    lp: {...LP_TOKENS['xCOPE-USDC-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.xCOPE},
    isStake: false,

    fusion: true,
    legacy: true,
    dual: false,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'XnRBbNMf6YcWvC1u2vBXXuMcagmRBRLu1y84mpqnKwW',
    poolAuthority: 'AnYvA5H7oBeA1otnWHSu8ud3waFsEmfUbdAoM1VzdVvt',
    poolLpTokenAccount: '6tXWzm8nLVtNtvqDH8bZNfUwpSjEcKZoJFpcV4hC5rLD', // lp vault
    poolRewardTokenAccount: '8GoDpozsDk3U3J36vvPiq3YpnA6MeJb1QPVJFiupe2wR', // reward vault A
    poolRewardTokenAccountB: '7niS4ngxgZ3oynHwH82PnwJXicTnY3fo9Vubi1PnjzJq', // reward vault B
  },
  {
    name: 'STEP-USDC',
    lp: {...LP_TOKENS['STEP-USDC-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.STEP},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: false,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: '8xhjCzfzVcP79jE7jXR2xtNaSL6aJYoDRLVT9FMjpRTC',
    poolAuthority: '6wRMPrHKFzj3qB4j5yj4y9mDF89fZ6w7gD1cEzCJwT9B',
    poolLpTokenAccount: 'CP3wdgdSygYGLJMjKfbJMiANnYuAxXHPiLTtB124tzVX', // lp vault
    poolRewardTokenAccount: '3zSiR4XrrRPhsom2hh9iigYZZ7uCpMucfJnZRgREgH8j', // reward vault A
    poolRewardTokenAccountB: '4n3vRUk3wdtbGWgMFSaxUcnGLKwa2wiWVhqw7kv9JDVS', // reward vault B
  },
  {
    name: 'MEDIA-USDC',
    lp: {...LP_TOKENS['MEDIA-USDC-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.MEDIA},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: false,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'Ef1gD9JMzWF6PNw2uc4744zouh57GyWAeVTjHHbQ2nsu',
    poolAuthority: '3dhU2g3MSHK3LwjuE1VsEJCsNeWKyBJUMHt4EUXepTjs',
    poolLpTokenAccount: 'DGjRtqsjeubLCLPD3yH8fj1d7TnrD3jKBpwa1UbVk7E6', // lp vault
    poolRewardTokenAccount: 'Uen8f9Rn42i8sDTK5vEttrnX9AUwXV3yf6DFU63mKDb', // reward vault A
    poolRewardTokenAccountB: 'Ek6n7Myojb6pSpQuqk5AyS7KXQdXkJyZT7ki9baYCxds', // reward vault B
  },
  {
    name: 'COPE-USDC',
    lp: {...LP_TOKENS['COPE-USDC-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.COPE},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: false,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'AxVvbT9fDFEkmdLwKUJRY5HsG2RXAZbe1dRAgJ2bDDwg',
    poolAuthority: '3n1Vdmqu1MBUpBYMpYbpJAVFv4MeNMEa82waruLy7BDu',
    poolLpTokenAccount: 'BHLzrd5MgQy4NgmUsn542yXRZWkz1iV5bfWg8s8D4tVL', // lp vault
    poolRewardTokenAccount: '7nGY6xHCUR2MxJnHT1qvArRUEnpo2DsGGf6Pdu3tt9gv', // reward vault A
    poolRewardTokenAccountB: '6ezx1EivkxsJcZLYhSJFLc3nUs25iyubf8PPyRNEX3pL', // reward vault B
  },
  {
    name: 'MER-USDC',
    lp: {...LP_TOKENS['MER-USDC-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.MER},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: false,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'D4pYuD4tbir9KBsb7Kr63v9e86JY2UoUZeFK9eHKQFZM',
    poolAuthority: '2T46saTyTYeEFWyesRzLWj6y1ha9ngwcyWyGNn9q4zu4',
    poolLpTokenAccount: 'EV3wsqiMiNcBmo2mFkUuCtib36NpBCsC2vfkW3By1sSu', // lp vault
    poolRewardTokenAccount: '5gEH5Uq2QrqiEhdZ8YFAMY1HoYnKMiuu71f6BC25UXee', // reward vault A
    poolRewardTokenAccountB: 'FTP4hnN5GPtPYvkrscTkKWYVVQ56hV3f4wGgpEXgrDUD', // reward vault B
  },
  {
    name: 'ROPE-USDC',
    lp: {...LP_TOKENS['ROPE-USDC-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.ROPE},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: false,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'BLy8KuRck5bcJkQdMDLSZnL1Ka4heAZSGiwTJfEfY727',
    poolAuthority: '8xPzoFPHKWZHWmwKaxFUyVBf2V13HMbCrMDgaCZCLjgx',
    poolLpTokenAccount: 'DiebAVak6cub1Mn3yhhvgSvGhkAP1JTtyRGoAei4wrWE', // lp vault
    poolRewardTokenAccount: '4F9FaFewwsSF8Bsxukyj9NiEdPFQQ38dNKEDpZugYfdi', // reward vault A
    poolRewardTokenAccountB: '4tvLbnZEPZLuDf636DHEzrUxW8bDoZ5XyfVwk7ppDhbC', // reward vault B
  },
  {
    name: 'ALEPH-USDC',
    lp: {...LP_TOKENS['ALEPH-USDC-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.ALEPH},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: false,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'JAP8SFagJBm6vt2LoFGNeSJ1hKDZ2p3yXb3CvBx11How',
    poolAuthority: 'DVtR63sAnJPM9wdt1hYBqA5GTyFzjfcfdLTfsSzV85Ss',
    poolLpTokenAccount: 'feCzxSvVX4EboJV4cubjqoPTK41noaHUanz8ZNJmiBp', // lp vault
    poolRewardTokenAccount: '4mAhgUY8XGMY4743wuzVbLw7d5bqqTaxME8jmbC2YfH4', // reward vault A
    poolRewardTokenAccountB: '3sGDa8ir8GrkKbnBH6HP63JaYSs7nskmmVHpF2vuzaZr', // reward vault B
  },
  {
    name: 'TULIP-USDC',
    lp: {...LP_TOKENS['TULIP-USDC-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.TULIP},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: false,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: '7U8Z6TWQMtsMcHV2htALnF9VQonnD1MrVm17YtmGEGEw',
    poolAuthority: '9ZVNLEiBZ2u23P7rEJf5sXY7TZK723cmVs46pBRSbRnU',
    poolLpTokenAccount: 'B6xn6doS3Qfy1LJLbdcJa5MpJ4po2bgut1rKFvmmq6Ut', // lp vault
    poolRewardTokenAccount: 'GtPTgCr6nXiogRCWqGvLa8P6dJgZpHfAX3KxGMpxnGMJ', // reward vault A
    poolRewardTokenAccountB: '8qgijAifBGx2EAJ7zKAzk6z7dVpcDV9eHvTBwofmdTP5', // reward vault B
  },
  {
    name: 'SNY-USDC',
    lp: {...LP_TOKENS['SNY-USDC-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.SNY},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: false,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: '31QSh1TwgoA9GbvkgfEEwKEm11t8CR4KiQr6WCyJr7EN',
    poolAuthority: 'BbebocNt4ySwkufrY1X3wRG8PVefCRLFR2E2TGzZPkne',
    poolLpTokenAccount: '2t1qozn7xtWjuCqnnTx4PaKikajN2AQK3CVH6A5JqagY', // lp vault
    poolRewardTokenAccount: 'GXZq2zNPZ9odPWAPinxXK8B7cMaAN9CpbcaLicksJsbt', // reward vault A
    poolRewardTokenAccountB: 'DdSL2stD9UXfY2nj9MKrNPx8QTro1GGAY6rsBd9kJXMX', // reward vault B
  },
  {
    name: 'BOP-RAY',
    lp: {...LP_TOKENS['BOP-RAY-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.BOP},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: false,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'EEe8b72w5q6T86nYRNJdFcY25tznPzrd1jGjuxZ7f9mX',
    poolAuthority: '7d99wJT2nRjWe2eKF7FpzMFb7934KoRhLP7pp2bjRm9m',
    poolLpTokenAccount: 'FWMHgA5iUxz3zMYf7jRJk8Z9ebWNWpvd7358rGCPFr7M', // lp vault
    poolRewardTokenAccount: 'DhvRSrQUio8LpCJH4uFCvvK4MEYVrBA6xaj1hu9jVxZn', // reward vault A
    poolRewardTokenAccountB: '3c6552swYV5nBTKTCWfKURjN1uGjtceanfb3vRbHNXpN', // reward vault B
  },
  {
    name: 'SLRS-USDC',
    lp: {...LP_TOKENS['SLRS-USDC-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.SLRS},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: false,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: '5PVVwSqwzkCvuiKEZwWkM35ApBnoWqF8XopsVZjPwA8z',
    poolAuthority: '7jNUxDiLLyke8ECShavvPPQz4D1abj4aCZwQfZ3TCTAX',
    poolLpTokenAccount: 'HTr2pYDBQZP13YTzLdsPzmh6e4hsNeqoGy3B777ejqTT', // lp vault
    poolRewardTokenAccount: 'Ef1tQ2E2Fe92xPVpQGzZFHmT7g7dh2hzVfWYVJJQPdbu', // reward vault A
    poolRewardTokenAccountB: 'Ffmv9Ximzk8D9oKwHkkgdq9cVxv5P5Y9LxEJdu1N1jSJ', // reward vault B
  },
  {
    name: 'SAMO-RAY',
    lp: {...LP_TOKENS['SAMO-RAY-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.SAMO},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: false,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'Bw932pURVJRYjEJwRZGWjfUNpeyz18kjMNdb833eMxoj',
    poolAuthority: 'FzTbGLdzgWCRkq8hbS8tLf5HjfU7JzUbtRmTkjGQB9Vz',
    poolLpTokenAccount: 'GUVKfYMiGEyp41CUw2j2NsoQJ5zDQ3Q6uSdApM8W46Ba', // lp vault
    poolRewardTokenAccount: 'J99YW5wnfgBJcG17BgSbp1S8RNJ39JAb7kg9RGHyb3Hq', // reward vault A
    poolRewardTokenAccountB: 'GhctEMRSwvdZF7aFeCLdK9X1sAAeGVPjr12iVLjQNvhy', // reward vault B
  },
  {
    name: 'LIKE-USDC',
    lp: {...LP_TOKENS['LIKE-USDC-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.LIKE},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: false,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'BRM5bdX2mjmFGg2RAent1Whd61o9asQD16BXsC6QvEni',
    poolAuthority: '9rThpjxEgNR5xi2z2QgXenS2RwRrrN1GqrudegT32Ygy',
    poolLpTokenAccount: 'FzVu8n4UCf3o1KH4X8khM9KgKA96dJQdQMPtLvmbHyNi', // lp vault
    poolRewardTokenAccount: '3G1cbktUU79CT3zskP16VYmEhwVQq2RYxVWV7fcjmkTX', // reward vault A
    poolRewardTokenAccountB: '2Ks41qfN2GZffbd1cqrNGuXJYJbShHhz6aHQvq8SaYYr', // reward vault B
  },
  {
    name: 'RAY-SOL',
    lp: {...LP_TOKENS['RAY-SOL-V4']},
    reward: {...TOKENS.RAY},
    isStake: false,

    fusion: false,
    legacy: false,
    dual: false,
    version: 3,
    programId: STAKE_PROGRAM_ID,

    poolId: 'HUDr9BDaAGqi37xbQHzxCyXvfMCKPTPNF8g9c9bPu1Fu',
    poolAuthority: '9VbmvaaPeNAke2MAL3h2Fw82VubH1tBCzwBzaWybGKiG',
    poolLpTokenAccount: 'A4xQv2BQPB1WxsjiCC7tcMH7zUq255uCBkevFj8qSCyJ', // lp vault
    poolRewardTokenAccount: '6zA5RAQYgazm4dniS8AigjGFtRi4xneqjL7ehrSqCmhr', // reward vault A
  },
  {
    name: 'RAY-USDC',
    lp: {...LP_TOKENS['RAY-USDC-V4']},
    reward: {...TOKENS.RAY},
    isStake: false,

    fusion: false,
    legacy: false,
    dual: false,
    version: 3,
    programId: STAKE_PROGRAM_ID,

    poolId: 'CHYrUBX2RKX8iBg7gYTkccoGNBzP44LdaazMHCLcdEgS',
    poolAuthority: '5KQFnDd33J5NaMC9hQ64P5XzaaSz8Pt7NBCkZFYn1po',
    poolLpTokenAccount: 'BNnXLFGva3K8ACruAc1gaP49NCbLkyE6xWhGV4G2HLrs', // lp vault
    poolRewardTokenAccount: 'DpRueBHHhrQNvrjZX7CwGitJDJ8eZc3AHcyFMG4LqCQR', // reward vault A
  },
  {
    name: 'RAY-ETH',
    lp: {...LP_TOKENS['RAY-ETH-V4']},
    reward: {...TOKENS.RAY},
    isStake: false,

    fusion: false,
    legacy: false,
    dual: false,
    version: 3,
    programId: STAKE_PROGRAM_ID,

    poolId: 'B6fbnZZ7sbKHR18ffEDD5Nncgp54iKN1GbCgjTRdqhS1',
    poolAuthority: '6amoZ7YBbsz3uUUbkeEH4vDTNwjvgjxTiu6nGi9z1JGe',
    poolLpTokenAccount: 'BjAfXpHTHz2kipraNddS6WwQvGGtbvyobn7MxLEEYfrH', // lp vault
    poolRewardTokenAccount: '7YfTgYQFGEJ4kb8jCF8cBrrUwEFskLin3EbvE1crqiQh', // reward vault A
  },
  {
    name: 'RAY-SRM',
    lp: {...LP_TOKENS['RAY-SRM-V4']},
    reward: {...TOKENS.RAY},
    isStake: false,

    fusion: false,
    legacy: false,
    dual: false,
    version: 3,
    programId: STAKE_PROGRAM_ID,

    poolId: '5DFbcYNLLy5SJiBpCCDzNSs7cWCsUbYnCkLXzcPQiKnR',
    poolAuthority: 'DdFXxCbn5vpxPRaGmurmefCTTSUa5XZ9Kh6Noc4bvrU9',
    poolLpTokenAccount: '792c58UHPPuLJcYZ6nawcD5F5NQXGbBos9ZGczTrLSdb', // lp vault
    poolRewardTokenAccount: '5ihtMmeTAx3kdf459Yt3bqos5zDe4WBBcSZSB6ooNxLt', // reward vault A
  },
  {
    name: 'MNGO-USDC',
    lp: {...LP_TOKENS['MNGO-USDC-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.MNGO},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: false,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'GzEDEkHSFFfxKMu3Toww1nrEjtbQGJKRPNRK1Pfd59Zn',
    poolAuthority: '9AMvw1TUJ9gX1kUAvcmHt2ZjokBLepXQbN8EJxBVZu2s',
    poolLpTokenAccount: 'gjrMLKsNwXYzJnX9DT8Lc7HeC1AT52jQKtDkPiRRuEP', // lp vault
    poolRewardTokenAccount: '4czqUC2ebdvqxPXfRniknLk7Cr2TosTabQSRnUeFia9v', // reward vault A
    poolRewardTokenAccountB: '6K1AE1wnTNaMgcAgQPvrTbnWEHB7nW6uTtv7ZbXWgMtn', // reward vault B
  },
  {
    name: 'COPE-RAY',
    lp: {...LP_TOKENS['COPE-RAY-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.COPE},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: true,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'CM9XTJfXEHceGPXhmXxheR87Ng9CZ4jiBoTVQHhs9DVN',
    poolAuthority: 'AWYeNgCErUafmBU2TtZgzNwixpKd3BxRTmvYDw7U1jgN',
    poolLpTokenAccount: 'FLqRe3W9Lp59uNgzkACsXpEZkWUxBBstMtUyGSzqFhXD', // lp vault
    poolRewardTokenAccount: 'Ex23TUPEarZepXdHgjm7LVy35HDWY2VgeKao5kjYRZGE', // reward vault A
    poolRewardTokenAccountB: 'JDjSMCSK9s9dDsiiXeT3HVaX48k7WewyKBoMPax3TZxL', // reward vault B
  },
  {
    name: 'LIKE-RAY',
    lp: {...LP_TOKENS['LIKE-RAY-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.LIKE},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: true,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'AMcVWK66iexwwCHn8drxywdNr2UgH3vmRzLXQFdErGmL',
    poolAuthority: '32yVBkvq29AmXKu1A3xUtgHrMGFnLvxF18fhd4JLKfJs',
    poolLpTokenAccount: '6f72fpk4WDeqpTJZ4dLSvAacfwmCAfEk7RtuPQ5oyNd7', // lp vault
    poolRewardTokenAccount: '4oPdHXXdRmjtKMLCcK8rtp3vMmq9y9LJ6W83mqrqMjCt', // reward vault A
    poolRewardTokenAccountB: 'E49fLhK6Wv43FySZB1xybPghzK2cjr9hgfpcmcVSLeYm', // reward vault B
  },
  {
    name: 'MEDIA-RAY',
    lp: {...LP_TOKENS['MEDIA-RAY-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.MEDIA},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: true,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'DJfvL6srBht8XFMWYuuKHYGainqvwXyA5icVsDne3pwN',
    poolAuthority: '69PxTdPaRSofBJkwT9mYW14cPUEe7fU2AYEDvt3q5Fkt',
    poolLpTokenAccount: '3Kaibb6xYpKjFejtkgH8tBrMWShWzwBd7WfcGygZ4Vcw', // lp vault
    poolRewardTokenAccount: '28kE8Erc2uFThiUr8RifoUEc9Kv8V54To6DJLgCuJEPp', // reward vault A
    poolRewardTokenAccountB: '3kofbYH2hPefwHSgMburaGN5XmJx7sD94jo5CsMCXzLE', // reward vault B
  },
  {
    name: 'MER-RAY',
    lp: {...LP_TOKENS['MER-RAY-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.MER},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: true,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: '21xhrT4j8QnaBvj3QjhP5kZu8sXJMCE7hzHKGtWEkdKr',
    poolAuthority: '6GrjogDgJ56mPcNu1nFw7MVLMALoNzd6RsZiXrQAuTvh',
    poolLpTokenAccount: 'Ee4zr6okPiyG6ia8kZfPwoNRDtNsrn4YfPc7MMmTqufR', // lp vault
    poolRewardTokenAccount: 'FnSG5cBXyEqo3DxKrcjhj7wo8un3HrxABQrxfA5uKWsg', // reward vault A
    poolRewardTokenAccountB: '8yL9QK96Ag3NnvqZmcaupb7c4NeP5hJXraGS3jCzMzT', // reward vault B
  },
  {
    name: 'SLRS-RAY',
    lp: {...LP_TOKENS['SLRS-RAY-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.SLRS},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: true,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'J61AnYYSwjtJ4wDqEqqWSBuZbiR2SDDrtF7FFobutM6a',
    poolAuthority: 'BHGHqkJomVD5tKNMZFajA1PZEJaZW5Yywyp6UAcvf1Wq',
    poolLpTokenAccount: 'H8NEHvqm43DxWbMfvLMvUqoKrjG4B4EJXEYBz2DYhRHd', // lp vault
    poolRewardTokenAccount: '5g1ox4cwcfNFsqPiGH2zhsHYpaBf6rkigL6YR5ZBQA5k', // reward vault A
    poolRewardTokenAccountB: '95b2zMqRGsovcR69XXfRPcvLdyvLCH5M5nd4z27yC8Q1', // reward vault B
  },
  {
    name: 'SNY-RAY',
    lp: {...LP_TOKENS['SNY-RAY-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.SNY},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: true,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'JEC3P83x2GEijYDwXiksuh5H6YrQt5xW6MC2GDKkMoe',
    poolAuthority: '9qwnkx2gRMLVoYkJVkyH2Yza5e5E7LoZEpx9jZ9r3CBY',
    poolLpTokenAccount: '7JrCLqrhH9kb78St4dAncBYE9VhZdB4P1tFAdxwzDrH5', // lp vault
    poolRewardTokenAccount: 'HmovkXKsso8xHwPYmMYF5bmP5CCwCtReQVb8ETTSSoyN', // reward vault A
    poolRewardTokenAccountB: 'GXJSX1JNjjAK6jEEjujvzhCjMeVnZmpJ5fng3daynCnY', // reward vault B
  },
  {
    name: 'TULIP-RAY',
    lp: {...LP_TOKENS['TULIP-RAY-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.TULIP},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: true,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'BmbG9hv5PazcW3rYWvatA6HpNPkozEdkWBiU64pZxuwr',
    poolAuthority: '956MvcyRBPMZ6waK3bdD4dn3XfaganoKed1NUQ9NaFAg',
    poolLpTokenAccount: 'HMgHKCLetHYDUJZEXKRJCiSeQs4Udwy6MNXHoLruMctH', // lp vault
    poolRewardTokenAccount: '5ih22SsrffDjygZHF8ADyJa4TNKQZqANg7dXyBJN9V8P', // reward vault A
    poolRewardTokenAccountB: '3zK56FmEqeH93BuH5K7JY9ZaEfFMdo3YjAasFikCmDB1', // reward vault B
  },
  {
    name: 'ALEPH-RAY',
    lp: {...LP_TOKENS['ALEPH-RAY-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.ALEPH},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: true,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: '4wvZ9SwWaHKTpshQbCSKQoPosZp9KGwUzuQdESi39qPn',
    poolAuthority: 'G3tniqor4UrtE29UQLGcBBuk4ScvonDpXiPSDTK3RioJ',
    poolLpTokenAccount: 'Fx32reDAB5MyJJwr8CjCM1fNgFsmnjhaxjC9pJswpUok', // lp vault
    poolRewardTokenAccount: '34gWdzwgj1zWQG4iwSbTeUDbQkoR8DXzLFQJsSpPDXLa', // reward vault A
    poolRewardTokenAccountB: 'Gm4v69FCZ33HZsHAgtdezAUJK6n5fQ3zHpTZxAAzeyoJ', // reward vault B
  },
  {
    name: 'RAY-SRM',
    lp: {...LP_TOKENS['RAY-SRM-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.SRM},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: true,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'BnYoq5y2MoH4TsBHeEZrEPowhwebHxQq7nJW1vTjPTWu',
    poolAuthority: '8JMnGryLkzSYdnTUPGRgxHoAmP5soH8L8TRre91Gjgni',
    poolLpTokenAccount: '6tuhozgcTA25fq5Lp11QX9HsG8MVspUjtcn7EgYP1cs5', // lp vault
    poolRewardTokenAccount: 'ED6Ak5wnnegeVz6jWMzGEEnFQ7HY55uPdxR8Ha6hk7gz', // reward vault A
    poolRewardTokenAccountB: 'G4zqVtnHSK9Sp3SVdiQ5K56m46BdAoE2uQqpgVsmRG9d', // reward vault B
  },
  {
    name: 'ATLAS-USDC',
    lp: {...LP_TOKENS['ATLAS-USDC-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.ATLAS},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: false,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: '93wRz2LeQ3TJoair827VTng62MjCzYDgJjG9Q5GmQ3Pd',
    poolAuthority: '4yrRmmckKKGsPbCSFFupGqZrJhAFxQ4hN2DMC9Bh2pHo',
    poolLpTokenAccount: 'HmE21hdD32ZjDnR5DvuNz7uS5q4bWbqf8jV2shx8kXmA', // lp vault
    poolRewardTokenAccount: '9iQsupP7JagNLkp1bvdWWGVkzsLFfHUwDbh9KZPoXbw5', // reward vault A
    poolRewardTokenAccountB: '5oQU1hU6qggyT4CU2AMPcWTcZdSRZeQBy7How5WuEp7A', // reward vault B
  },
  {
    name: 'POLIS-USDC',
    lp: {...LP_TOKENS['POLIS-USDC-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.POLIS},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: false,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: '7qcihXTsRW5wS5BgK7iuD84W43ECByoJP45R3hu2r6mF',
    poolAuthority: '3MAzzKcBPJ2ykDHX1CBHzUJafy41FaTaLymg8z6SgX2Q',
    poolLpTokenAccount: 'FwLD6rHMwm5H6edDPuGjxdBMk3u38frsnytTkPmVZVP3', // lp vault
    poolRewardTokenAccount: 'AWQr1eX2RZiMadfeEpgPEQJBJq88f7dPLK3nqriKCPJp', // reward vault A
    poolRewardTokenAccountB: 'DfofnRgWFPHVaxaLGSdXvFGhr4TRwjdwQQvgkjNNkJfZ', // reward vault B
  },
  {
    name: 'ATLAS-RAY',
    lp: {...LP_TOKENS['ATLAS-RAY-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.ATLAS},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: true,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'BHHhNLdJn69K1XPJcpcw4MBY3TPetpLxhj8s4K4ydsDV',
    poolAuthority: 'DjYd34HtSwwAGfTfK13onUyq975akjzfW2abaK5YTRaS',
    poolLpTokenAccount: '5RPJHt2V4baK7gY1E99xCRBtEzScuNEVPr9vA9PapLhs', // lp vault
    poolRewardTokenAccount: 'AQwjpEoLwnHYnsdSnzwRpSkTSeLDNYZ6tv6odVGzXJvZ', // reward vault A
    poolRewardTokenAccountB: 'DBXQnchh5zQuiEfaE8JBPTre8G1mksVTsHXoSqRPfA3r', // reward vault B
  },
  {
    name: 'POLIS-RAY',
    lp: {...LP_TOKENS['POLIS-RAY-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.POLIS},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: true,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: 'HHm8Pgnzc56fTUYkicPv4DqGYp5fcPZFV1V1uhixSrMk',
    poolAuthority: 'GHPg6z7HYx1bsdK4W9WpdmV8BcjpPBBsRGMmj9dAD3yq',
    poolLpTokenAccount: '4wGbaNEGeGjqqgW5S9AAWvQL3LwWZioH1JWMZFBdPFge', // lp vault
    poolRewardTokenAccount: '4xrr44aG4kkgqQPZhBre93vg5fFY2htkkEEmTQjx5hiG', // reward vault A
    poolRewardTokenAccountB: 'EanBQNubTJs2fNgeosUcESCfBnvk6bci391U5SH4Kzoo', // reward vault B
  },
  {
    name: 'GRAPE-USDC',
    lp: {...LP_TOKENS['GRAPE-USDC-V4']},
    reward: {...TOKENS.RAY},
    rewardB: {...TOKENS.GRAPE},
    isStake: false,

    fusion: true,
    legacy: false,
    dual: false,
    version: 5,
    programId: STAKE_PROGRAM_ID_V5,

    poolId: '8GBa1cK1NxevoxiRNK6YW9tWuo2xftcA3as9Cu4nhFL7',
    poolAuthority: 'Gab4kPHmj5Hqn1KWEDsKt6Ta8jPtpc53oCPULszMNtyj',
    poolLpTokenAccount: 'eoVzVdFEkKPKY3djJ47RZjvNr5oujYY25uxXwNvrsfg', // lp vault
    poolRewardTokenAccount: 'AYoDAc5ndfts4Aw6vzH7XUB2GsXamj72aunzBcBCnz2f', // reward vault A
    poolRewardTokenAccountB: '5i2qZN5UH4UyF3t6HNeC1bXeXhWBZy1pwpCjLDG7AdJJ', // reward vault B
  },
].sort((a, b) => (a.fusion === true && b.fusion === false ? 1 : -1));

const ACCOUNT_LAYOUT = BufferLayout.struct([
  BufferLayout.blob(32, 'mint'),
  BufferLayout.blob(32, 'owner'),
  BufferLayout.nu64('amount'),
  BufferLayout.blob(93),
]);

const MINT_LAYOUT = BufferLayout.struct([
  BufferLayout.blob(44),
  BufferLayout.u8('decimals'),
  BufferLayout.blob(37),
]);

const LAYOUT = BufferLayout.union(BufferLayout.u8('instruction'));
LAYOUT.addVariant(
  0,
  BufferLayout.struct([
    BufferLayout.u8('decimals'),
    BufferLayout.blob(32, 'mintAuthority'),
    BufferLayout.u8('freezeAuthorityOption'),
    BufferLayout.blob(32, 'freezeAuthority'),
  ]),
  'initializeMint',
);
LAYOUT.addVariant(1, BufferLayout.struct([]), 'initializeAccount');
LAYOUT.addVariant(
  7,
  BufferLayout.struct([BufferLayout.nu64('amount')]),
  'mintTo',
);
LAYOUT.addVariant(
  8,
  BufferLayout.struct([BufferLayout.nu64('amount')]),
  'burn',
);
LAYOUT.addVariant(9, BufferLayout.struct([]), 'closeAccount');
LAYOUT.addVariant(
  12,
  BufferLayout.struct([
    BufferLayout.nu64('amount'),
    BufferLayout.u8('decimals'),
  ]),
  'transferChecked',
);

const instructionMaxSpan = Math.max(
  ...Object.values(LAYOUT.registry).map((r) => r.span),
);

function encodeTokenInstructionData(instruction) {
  const b = Buffer.alloc(instructionMaxSpan);
  const span = LAYOUT.encode(instruction, b);
  return b.slice(0, span);
}

const createAssociatedTokenAccountIfNotExist = async (
  account,
  owner,
  mintAddress,
  transaction,
  atas,
) => {
  let publicKey;
  if (account) {
    publicKey = new PublicKey(account);
  }

  const mint = new PublicKey(mintAddress);
  // @ts-ignore without ts ignore, yarn build will failed
  const ata = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint,
    owner,
    true,
  );

  if (
    (!publicKey || !ata.equals(publicKey)) &&
    // mintAddress !== TOKENS.WSOL.mintAddress &&
    mintAddress !== WRAPPED_SOL_MINT.toString() &&
    !atas.includes(ata.toBase58())
  ) {
    transaction.add(
      Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mint,
        ata,
        owner,
        owner,
      ),
    );
    atas.push(ata.toBase58());
  }

  return ata;
};

const createProgramAccountIfNotExist = async (
  connection,
  account,
  owner,
  programId,
  lamports,
  layout,
  transaction,
  signer,
) => {
  let publicKey;

  if (account) {
    publicKey = new PublicKey(account);
  } else {
    const newAccount = new Account();
    publicKey = newAccount.publicKey;

    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: owner,
        newAccountPubkey: publicKey,
        lamports:
          lamports ??
          (await connection.getMinimumBalanceForRentExemption(layout.span)),
        space: layout.span,
        programId,
      }),
    );

    signer.push(newAccount);
  }

  return publicKey;
};

const USER_STAKE_INFO_ACCOUNT_LAYOUT = struct([
  u64('state'),
  publicKey('poolId'),
  publicKey('stakerOwner'),
  u64('depositBalance'),
  u64('rewardDebt'),
]);

const getBigNumber = (num) => {
  return num === undefined || num === null ? 0 : parseFloat(num.toString());
};

const depositInstruction = (
  programId,
  // staking pool
  poolId,
  poolAuthority,
  // user
  userInfoAccount,
  userOwner,
  userLpTokenAccount,
  poolLpTokenAccount,
  userRewardTokenAccount,
  poolRewardTokenAccount,
  // tokenProgramId: PublicKey,
  amount,
) => {
  const dataLayout = struct([u8('instruction'), nu64('amount')]);

  const keys = [
    {pubkey: poolId, isSigner: false, isWritable: true},
    {pubkey: poolAuthority, isSigner: false, isWritable: false},
    {pubkey: userInfoAccount, isSigner: false, isWritable: true},
    {pubkey: userOwner, isSigner: true, isWritable: false},
    {pubkey: userLpTokenAccount, isSigner: false, isWritable: true},
    {pubkey: poolLpTokenAccount, isSigner: false, isWritable: true},
    {pubkey: userRewardTokenAccount, isSigner: false, isWritable: true},
    {pubkey: poolRewardTokenAccount, isSigner: false, isWritable: true},
    {pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false},
    {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
  ];

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 1,
      amount,
    },
    data,
  );

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
};

const withdrawInstruction = (
  programId,
  // staking pool
  poolId,
  poolAuthority,
  // user
  userInfoAccount,
  userOwner,
  userLpTokenAccount,
  poolLpTokenAccount,
  userRewardTokenAccount,
  poolRewardTokenAccount,
  // tokenProgramId: PublicKey,
  amount,
) => {
  const dataLayout = struct([u8('instruction'), nu64('amount')]);

  const keys = [
    {pubkey: poolId, isSigner: false, isWritable: true},
    {pubkey: poolAuthority, isSigner: false, isWritable: false},
    {pubkey: userInfoAccount, isSigner: false, isWritable: true},
    {pubkey: userOwner, isSigner: true, isWritable: false},
    {pubkey: userLpTokenAccount, isSigner: false, isWritable: true},
    {pubkey: poolLpTokenAccount, isSigner: false, isWritable: true},
    {pubkey: userRewardTokenAccount, isSigner: false, isWritable: true},
    {pubkey: poolRewardTokenAccount, isSigner: false, isWritable: true},
    {pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false},
    {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
  ];

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 2,
      amount,
    },
    data,
  );

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
};

const getMultipleAccounts = async (connection, publicKeys, commitment) => {
  const keys = [];
  let tempKeys = [];

  publicKeys.forEach((k) => {
    if (tempKeys.length >= 100) {
      keys.push(tempKeys);
      tempKeys = [];
    }
    tempKeys.push(k);
  });
  if (tempKeys.length > 0) {
    keys.push(tempKeys);
  }

  const accounts = [];

  const resArray = {};
  await Promise.all(
    keys.map(async (key, index) => {
      const res = await connection.getMultipleAccountsInfo(key, commitment);
      resArray[index] = res;
    }),
  );

  Object.keys(resArray)
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .forEach((itemIndex) => {
      const res = resArray[parseInt(itemIndex, 10)];
      for (const account of res) {
        accounts.push(account);
      }
    });

  return accounts.map((account, idx) => {
    if (account === null) {
      return null;
    }
    return {
      publicKey,
      account,
    };
  });
};

const getInfoAccount = async (accountAddress, connection) => {
  const filter = {
    commitment: connection.commitment,
    filters: [
      {
        memcmp: {
          offset: 40,
          bytes: new PublicKey(accountAddress).toBase58(),
        },
      },
      {
        dataSize: USER_STAKE_INFO_ACCOUNT_LAYOUT.span,
      },
    ],
    encoding: 'base64',
  };
  const getProgramAccounts = await connection.getProgramAccounts(
    new PublicKey(STAKE_PROGRAM_ID),
    filter,
  );

  const poolIdPublicKeys = [];
  getProgramAccounts.forEach((item) => {
    item.account.data = USER_STAKE_INFO_ACCOUNT_LAYOUT.decode(
      item.account.data,
    );
    poolIdPublicKeys.push(item.account.data.poolId);
  });

  const multipleInfo = await getMultipleAccounts(
    connection,
    poolIdPublicKeys,
    connection.commitment,
  );
  multipleInfo.forEach((info) => {
    info.account.data = STAKE_INFO_LAYOUT.decode(
      Buffer.from(info.account.data),
    );
  });

  getProgramAccounts.forEach((item) => {
    item.publicKey = item.pubkey.toString();
    item.decimals = FARMS.find((farm) => {
      return farm.poolId === item.account.data.poolId.toString();
    }).reward.decimals;
    item.name = FARMS.find((farm) => {
      return farm.poolId === item.account.data.poolId.toString();
    }).name;
    item.poolLpTokenAccount = FARMS.find((farm) => {
      return farm.poolId === item.account.data.poolId.toString();
    }).poolLpTokenAccount;
    item.farmInfo = multipleInfo.find(
      ({account}) =>
        account.data.poolLpTokenAccount.toString() === item.poolLpTokenAccount,
    );
    item.account.data.depositBalance = new TokenAmount(
      getBigNumber(item.account.data.depositBalance),
      item.decimals,
    );
    item.account.data.rewardDebt = new TokenAmount(
      item.account.data.rewardDebt,
      item.decimals,
    );
    item.rewardDebt = new TokenAmount(
      item.account.data.depositBalance.wei
        .multipliedBy(
          getBigNumber(item.farmInfo.account.data.rewardPerShareNet),
        )
        .dividedBy(1e9)
        .minus(item.account.data.rewardDebt.wei),
      item.decimals,
    ).toEther();
    item.depositBalance = item.account.data.depositBalance.toEther();
    item.pubkey = undefined;
    item.account = undefined;
    item.farmInfo = undefined;
    item.poolLpTokenAccount = undefined;
  });
  return getProgramAccounts;
};

module.exports = {
  toSOL,
  fromSOL,
  TOKEN_PROGRAM_ID,
  WRAPPED_SOL_MINT,
  MEMO_PROGRAM_ID,
  MINT_LAYOUT,
  ACCOUNT_LAYOUT,
  LAYOUT,
  createAssociatedTokenAccountIfNotExist,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createProgramAccountIfNotExist,
  USER_STAKE_INFO_ACCOUNT_LAYOUT,
  getBigNumber,
  STAKE_PROGRAM_ID,
  STAKE_PROGRAM_ID_V4,
  STAKE_PROGRAM_ID_V5,
  depositInstruction,
  withdrawInstruction,
  FARMS,
  lt,
  TokenAmount,
  getInfoAccount,
};
