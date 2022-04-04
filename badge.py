import json
import re
from functools import partial
from urllib.parse import urlsplit
from uuid import uuid4

import requests
from flask import Flask, jsonify, request
from redis import Redis

NAMESPACE = "exlg"
BADGE_KEY = "badge"
TOKEN_KEY = "token"
TRUE = "\0"
USER_AGENT = ""

_KEY = f"{NAMESPACE}:{{}}:{{key}}"  # Key to a specific field of user
key_to = partial(  # Key to a specific value of metadata
    lambda *l: ":".join(map(str, l)),
    NAMESPACE,
)
badge_of = partial(_KEY.format, key=BADGE_KEY)
app = Flask(__name__)
redis = Redis(decode_responses=True)


@app.route("/token/")
def token():
    uuid = uuid4().hex
    redis.set(key_to(TOKEN_KEY, uuid), TRUE, ex=60)
    return jsonify(uuid)


def _get_paste_id(data):
    if re.match(r"[0-9a-z]{8}$", data):
        return data
    url = urlsplit(data)
    paste_id = re.match(r"/paste/([0-9a-z]{8})(\?.+)?$", url.path)
    if (
        url.scheme in ["", "http", "https"]
        and url.hostname in [None, "www.luogu.com.cn", "www.luogu.org"]
        and url.port in [None, 80, 443]
        and paste_id
    ):
        return paste_id[1]
    raise ValueError("Invalid paste ID or URL")


@app.route("/token/verify/")
def token_verification():
    try:
        paste_id = _get_paste_id(request.json)
    except (ValueError, TypeError) as e:
        return jsonify({"error": repr(e)}), 400
    r = requests.get(
        "https://www.luogu.com.cn/paste/" + paste_id,
        headers={"user-agent": USER_AGENT, "x-luogu-type": "content-only"},
    )
    data = r.json()
    if r.status_code >= 400 or data["code"] >= 400:
        return jsonify({"error": data["currentData"]["errorMessage"]}), 403
    paste = data["currentData"]["paste"]
    if redis.get(key_to(TOKEN_KEY, paste["data"])):
        redis.delete(key_to(TOKEN_KEY, paste["data"]))
        redis.set(key_to(paste["user"]["uid"], paste["data"]), TRUE)
        return jsonify({"token": paste["data"], "uid": paste["user"]["uid"]})
    return jsonify({"error": f"Invalid paste content: {paste['data']}"}), 403


def json_loads(data):
    if data is not None:
        return json.loads(data)
    return {}


def json_dumps(data):
    return json.dumps(data, separators=(",", ":"))


@app.route("/badge/mget/", methods=["POST"])
def badge_mget():
    q = set(request.json)
    return jsonify(dict(zip(q, map(json_loads, redis.mget(map(badge_of, q))))))


@app.route("/badge/mset/", methods=["POST"])
def badge_mset():
    if redis.get(
        key_to(request.json["uid"], request.json["token"])
    ) and redis.get(key_to(request.json["uid"], "admin")):
        data = request.json["data"]
        redis.mset(
            dict(
                zip(
                    map(badge_of, data.keys()),
                    map(json_dumps, data.values()),
                )
            )
        )
        return jsonify(data)
    else:
        return jsonify({"error": "Access denied"}), 403


@app.route("/badge/set/", methods=["POST"])
def badge_set():
    if redis.get(key_to(request.json["uid"], request.json["token"])):
        redis.set(
            badge_of(request.json["uid"]),
            json_dumps(request.json["data"]),
        )
        return jsonify({(request.json["uid"]): request.json["data"]})
    else:
        return jsonify({"error": "Access denied"}), 403


if __name__ == "__main__":
    app.run()
