const assert = require('assert')
const bugsnag = require('bugsnag')
const express = require('express')
const bodyParser = require('body-parser')
const ModelLayer = require('./model-layer')

const PERCENTAGE_OF_TWILIO_TTL_TO_USE_FOR_CACHE_HEADER = 0.95

module.exports = ({modelLayer, pubSubGateway, identityProvider, fetchICEServers, healthCheckSecret}) => {
  const app = express()
  app.use(bodyParser.json({limit: '1mb'}))
  app.use(bugsnag.requestHandler)

  app.get('/protocol-version', function (req, res) {
    res.send({version: 1})
  })

  app.get('/ice-servers', async function (req, res) {
    if (fetchICEServers) {
      const {servers, ttl} = await fetchICEServers()
      const maxAgeInSeconds = ttl * PERCENTAGE_OF_TWILIO_TTL_TO_USE_FOR_CACHE_HEADER
      res.set('Cache-Control', `private, max-age=${maxAgeInSeconds}`)
      res.send(servers)
    } else {
      res.send([])
    }
  })

  app.post('/peers/:id/signals', async function (req, res) {
    const {senderId, oauthToken, signal, sequenceNumber, testEpoch} = req.body

    const message = {senderId, signal, sequenceNumber}
    if (testEpoch != null) message.testEpoch = testEpoch

    // TODO _Expect_ oauthToken to be present
    // TODO Handle failure cases
    if (oauthToken != null) message.user = await identityProvider.getUser(oauthToken)

    pubSubGateway.broadcast(
      `/peers/${req.params.id}`,
      'signal',
      message
    )

    res.send({})
  })

  app.post('/portals', async function (req, res) {
    const id = await modelLayer.createPortal({hostPeerId: req.body.hostPeerId})
    res.send({id})
  })

  app.get('/portals/:id', async function (req, res) {
    const portal = await modelLayer.findPortal(req.params.id)
    if (portal) {
      res.send({hostPeerId: portal.hostPeerId})
    } else {
      res.status(404).send({})
    }
  })

  // TODO Replace hardcoded status code with a status code that is specific to the error that occurred
  app.get('/user', async function (req, res) {
    const oauthToken = req.get('GitHub-OAuth-token')
    await identityProvider.getUser(oauthToken).then(
      (user) => { res.send(user) },
      (error) => { res.status(401).send({message: error}) }
    )
  })

  // For use in testing exception reporting (i.e., bugsnag integration)
  app.get('/boomtown', function (req, res) {
    if (!isAuthorizedForHealthCheck(req)) {
      res.status(404).send({})
      return
    }

    throw new Error('boom')
  })

  app.get('/_ping', async function (req, res) {
    const unhealthyServices = []
    if (!await pubSubGateway.isOperational()) unhealthyServices.push('pubSubGateway')
    if (!await modelLayer.isOperational()) unhealthyServices.push('db')
    if (!await isICEServerProviderOperational()) unhealthyServices.push('iceServerProvider')

    if (unhealthyServices.length === 0) {
      res.status(200).send({
        now: Date.now(),
        status: 'ok'
      })
    } else {
      res.status(503).send({
        now: Date.now(),
        status: 'failures',
        failures: unhealthyServices
      })
    }
  })

  function isAuthorizedForHealthCheck (req) {
    return req.query.secret === healthCheckSecret
  }

  async function isICEServerProviderOperational () {
    try {
      await fetchICEServers()
      return true
    } catch (_) {
      return false
    }
  }

  app.use(bugsnag.errorHandler)
  return app
}
