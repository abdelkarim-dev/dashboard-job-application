// Thin Express response/request helpers used by the dispatch ladder.

function send(res, status, body, headers = {}) {
  res.status(status).set(headers).send(body);
}

function sendJson(res, status, data) {
  res.status(status).json(data);
}

async function readBody(req) {
  return req.body || {};
}

export {
  send,
  sendJson,
  readBody,
};
