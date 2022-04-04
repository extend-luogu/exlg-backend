import json
import re
from urllib.parse import urlsplit


def json_loads(data):
    if data is not None:
        return json.loads(data)
    return {}


def json_dumps(data):
    return json.dumps(data, separators=(",", ":"))


def get_paste_id(data):
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
