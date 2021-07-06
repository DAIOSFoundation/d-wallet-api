const request = require('supertest');
const assert = require('assert');
const axios = require('axios');
const server = require('../app');
const {testNetUrl, publicUrl} = require('../config/XLM/stellar');

// Check Horizon Network
before(async () => {
  const testNetResponse = await axios.get(testNetUrl);
  const publicResponse = await axios.get(publicUrl);
  if (testNetResponse.status !== 200) {
    console.log(`${testNetUrl} Connection Failed ${testNetResponse.status}`);
  } else {
    console.log(`${testNetUrl} Connection Success`);
  }
  if (publicResponse.status !== 200) {
    console.log(`${publicUrl} Connection Failed ${publicResponse.status}`);
  } else {
    console.log(`${publicUrl} Connection Success`);
  }
});

// 가능한 한 Postman 내부 API 이름과 똑같이 맞출 것
describe('Stellar APIs', () => {
  const agent = request.agent(server);
  it('키 생성', (done) => {
    agent
      .post('/v1/xlm/key')
      .expect((res) => {
        console.log('publicKey => ', res.body.data.publicKey);
        console.log('secretKey => ', res.body.data.secretKey);
        assert.ok(res.body.data.publicKey.startsWith('G'));
        assert.ok(res.body.data.secretKey.startsWith('S'));
      })
      .expect(200, done);
  });
  it('니모닉 생성', (done) => {
    agent
      .post('/v1/xlm/mnemonic')
      .expect((res) => {
        assert.ok(res.body.data.mnemonic);
      })
      .expect(200, done);
  });
  it('실시간 수수료 조회', async () => {
    const response = await agent.get('/v1/xlm/feeStats?network=TESTNET');
    assert.ok(response.body.data.last_ledger);
    assert.ok(response.body.data.last_ledger_base_fee);
  });
  it('잔액조회', (done) => {
    agent
      .get(
        '/v1/xlm/balance?network=PUBLIC&address=GCJE27RLTN5LWX3F5WYFNCXZH2COZE5XPO7XE5K6JEVTSX3L4W2RRPNJ',
      )
      .expect((res) => {
        assert.ok(res.body.data.address);
      })
      .expect(200, done);
  });
});
