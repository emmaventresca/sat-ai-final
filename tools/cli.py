#!/usr/bin/env python3
"""One place that knows how to call the `claude` CLI.

Every tool here shells out to the same binary, and each had its own copy of
the call with its own idea of what a failure means. That cost a whole run:
287 authoring cells and 410 verifications failed in a burst, every one of
them recorded as `RuntimeError` with an empty message, because the CLI exits
non-zero and prints nothing to stderr when it is rate limited. The work was
retryable and we threw it away instead.

Three things this fixes, and they are the three things that went wrong:

  **A failure always says something.** An empty error message reads as falsy
  downstream, which is how items end up marked as quality failures when they
  were never actually tested.

  **Transient failures are retried.** A rate limit is not a verdict. Backoff
  is exponential with jitter so eight workers do not come back in lockstep
  and trip the same limit again.

  **A run that is failing everywhere stops.** If the limit is genuinely
  exhausted, grinding through 287 more cells produces nothing but a long log
  and a large bill. The breaker trips after enough consecutive failures and
  the remaining work fails fast, still on the to-do list for next time.
"""
import json, os, random, subprocess, threading, time

USAGE_LOG = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "corpus", "usage.jsonl")
LEDGER = threading.Lock()

MAX_ATTEMPTS = 4
BASE_DELAY = 20.0            # seconds; a rate limit needs real time, not 1s
BREAKER_AFTER = 12           # consecutive failures across all threads


class Exhausted(RuntimeError):
    """The breaker is open: calls are failing everywhere, so stop asking."""


class _Breaker:
    def __init__(self):
        self.lock = threading.Lock()
        self.consecutive = 0
        self.open = False

    def ok(self):
        with self.lock:
            self.consecutive = 0

    def fail(self):
        with self.lock:
            self.consecutive += 1
            if self.consecutive >= BREAKER_AFTER:
                self.open = True
            return self.open

    def check(self):
        with self.lock:
            if self.open:
                raise Exhausted(
                    f"{self.consecutive} calls in a row failed - stopping "
                    f"rather than working through the rest of the queue. "
                    f"Usually the usage limit; try again later.")


BREAKER = _Breaker()


def _env():
    return {**os.environ,
            "PATH": os.environ["PATH"] + ":" + os.path.expanduser("~/.local/bin")}


def _unwrap(out):
    """Text and usage out of the CLI's JSON envelope.

    Falls back to treating the output as plain text, so a CLI that does not
    speak JSON still works rather than failing every call in the run.
    """
    try:
        doc = json.loads(out)
    except (ValueError, TypeError):
        return out, None
    if not isinstance(doc, dict) or "result" not in doc:
        return out, None
    if doc.get("is_error"):
        return None, None
    return doc["result"], doc


def meter(model, meta, tag=None):
    """Append one line to the usage ledger. Never raises.

    Metering must not be able to fail a run that already succeeded - the work
    is done and paid for by the time we get here, and losing it over a
    logging error would be absurd.
    """
    if not meta:
        return
    try:
        usage = meta.get("usage") or {}
        row = {
            "at": round(time.time()),
            "tag": tag,
            "model": model,
            "usd": meta.get("total_cost_usd"),
            "ms": meta.get("duration_ms"),
            "in": usage.get("input_tokens"),
            "out": usage.get("output_tokens"),
            "cache_read": usage.get("cache_read_input_tokens"),
            "cache_write": usage.get("cache_creation_input_tokens"),
        }
        os.makedirs(os.path.dirname(USAGE_LOG), exist_ok=True)
        with LEDGER:
            with open(USAGE_LOG, "a") as fh:
                fh.write(json.dumps(row) + "\n")
    except Exception:
        pass


def run_claude(prompt, model, timeout=900, attempts=MAX_ATTEMPTS,
               allowed_tools=None, tag=None):
    """Call the CLI and return its stdout, retrying transient failures.

    `allowed_tools` grants the headless run specific tools. Reading an image
    needs Read, and without it the CLI answers from nothing and says the
    permission was denied - which looks like a model that cannot see rather
    than a flag that was missing.
    """
    # JSON output so every call reports what it actually cost. The CLI
    # returns total_cost_usd and a full token breakdown alongside the text,
    # and without asking for it there is no way to know what the bank cost to
    # build - 3,160 authoring runs were logged with no usage at all.
    cmd = ["claude", "-p", prompt, "--model", model, "--output-format", "json"]
    if allowed_tools:
        cmd += ["--allowedTools", ",".join(allowed_tools)]
    last = None
    for attempt in range(1, attempts + 1):
        BREAKER.check()
        try:
            proc = subprocess.run(
                cmd, capture_output=True, text=True, timeout=timeout,
                # Without this the CLI waits three seconds for stdin that is
                # never coming, on every call.
                stdin=subprocess.DEVNULL, env=_env())
        except subprocess.TimeoutExpired:
            last = f"timed out after {timeout}s"
        else:
            if proc.returncode == 0 and proc.stdout.strip():
                text, meta = _unwrap(proc.stdout)
                if text is not None:
                    BREAKER.ok()
                    meter(model, meta, tag)
                    return text
                last = "the CLI returned something that was not a result"
            # Always carry something truthy: an empty message is how a call
            # that never happened gets mistaken for a call that said no.
            last = (proc.stderr.strip()[:200]
                    or (f"exited {proc.returncode} with no message"
                        if proc.returncode else "returned nothing"))
        if BREAKER.fail():
            BREAKER.check()
        if attempt < attempts:
            time.sleep(BASE_DELAY * (2 ** (attempt - 1)) * (0.5 + random.random()))
    raise RuntimeError(f"claude CLI failed after {attempts} attempts: {last}")


def _decode(text, opener):
    i = text.find(opener)
    if i == -1:
        raise ValueError(f"no JSON {opener} in output ({len(text)} chars): "
                         f"{text[:160]}")
    return json.JSONDecoder().raw_decode(text[i:])[0]


def call_json_array(prompt, model, timeout=900, allowed_tools=None, tag=None):
    return _decode(run_claude(prompt, model, timeout,
                              allowed_tools=allowed_tools, tag=tag), "[")


def call_json_object(prompt, model, timeout=600, allowed_tools=None, tag=None):
    return _decode(run_claude(prompt, model, timeout,
                              allowed_tools=allowed_tools, tag=tag), "{")
