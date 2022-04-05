from functools import partial
from uuid import uuid4

import requests
from flask import Flask, jsonify, request
from redis import Redis

from utils import get_paste_id, json_dumps, json_loads

NAMESPACE = "exlg"
ACTIVATION_KEY = "activation"
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


def token_required(func):
    def wrapper(*args, **kwargs):
        if (
            "uid" in request.json
            and "token" in request.json
            and redis.get(key_to(request.json["uid"], request.json["token"]))
        ):
            return func(*args, **kwargs)
        return jsonify({"error": "Authentication failed"}), 401

    wrapper.__name__ = func.__name__
    return wrapper


def admin_required(func):
    @token_required
    def wrapper(*args, **kwargs):
        if redis.get(key_to(request.json["uid"], "admin")):
            return func(*args, **kwargs)
        return jsonify({"error": "Access denied"}), 403

    wrapper.__name__ = func.__name__
    return wrapper


@app.route("/token/generate/")
def token_generation():
    uuid = uuid4().hex
    redis.set(key_to(TOKEN_KEY, uuid), TRUE, ex=60)
    return jsonify(uuid)


@app.route("/token/verify/", methods=["POST"])
def token_verification():
    try:
        paste_id = get_paste_id(request.json)
    except (ValueError, TypeError) as e:
        return jsonify({"error": repr(e)}), 422
    r = requests.get(
        "https://www.luogu.com.cn/paste/" + paste_id,
        headers={"user-agent": USER_AGENT, "x-luogu-type": "content-only"},
    )
    data = r.json()
    if r.status_code >= 400 or data["code"] >= 400:
        return jsonify({"error": data["currentData"]["errorMessage"]}), 422
    paste = data["currentData"]["paste"]
    if redis.get(key_to(TOKEN_KEY, paste["data"])):
        redis.delete(key_to(TOKEN_KEY, paste["data"]))
        redis.set(key_to(paste["user"]["uid"], paste["data"]), TRUE)
        return jsonify({"token": paste["data"], "uid": paste["user"]["uid"]})
    return jsonify({"error": f"Invalid paste content: {paste['data']}"}), 403


@app.route("/badge/mget/", methods=["POST"])
def badge_mget():
    q = set(request.json)
    return jsonify(dict(zip(q, map(json_loads, redis.mget(map(badge_of, q))))))


@app.route("/badge/mset/", methods=["POST"])
@admin_required
def badge_mset():
    data = request.json["data"]
    redis.mset(
        dict(zip(map(badge_of, data.keys()), map(json_dumps, data.values())))
    )
    return jsonify(data)


@app.route("/badge/set/", methods=["POST"])
@token_required
def badge_set():
    if not redis.exists(badge_of(request.json["uid"])) and (
        "activation" not in request.json
        or not redis.lrem(
            key_to(ACTIVATION_KEY), 1, request.json["activation"]
        )
    ):
        return jsonify({"error": "Activation failed"}), 402
    redis.set(
        badge_of(request.json["uid"]),
        json_dumps(request.json["data"]),
    )
    return jsonify({(request.json["uid"]): request.json["data"]})


if __name__ == "__main__":
    app.run()
