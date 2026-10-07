#!/usr/bin/env python3
"""Nudge the teacher to write up the lesson when a Zoom meeting ends.

No bot, no transcript, no recording, nothing that touches the meeting at
all. This watches, on this Mac only, for the Zoom meeting window going away
- and when it does, puts a notification in the corner that opens the teacher
portal on the lesson write-up.

That is a deliberate design choice rather than a limitation. A notetaker
that joins a call is capturing other people's speech, which in Connecticut
needs every participant's consent, which for students usually means a
parent's. The useful signal - what we covered, what they struggled with,
what I want for homework - is in the teacher's head anyway, and is worth
more thirty seconds after the call than reconstructed from a transcript.

    python3 tools/zoom/zoom_watch.py            # run in the foreground
    python3 tools/zoom/zoom_watch.py --install  # start it at login
    python3 tools/zoom/zoom_watch.py --uninstall
"""
import argparse, os, plistlib, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LABEL = "com.satai.zoomwatch"
PLIST = os.path.expanduser(f"~/Library/LaunchAgents/{LABEL}.plist")
PORTAL = os.environ.get("TEACHER_PORTAL",
                        "http://localhost:8770/web/teacher.html#debrief")
POLL = 5
# A meeting shorter than this is a mis-click or a test connection, not a
# lesson worth writing up.
MIN_MEETING = 4 * 60


def in_meeting():
    """Is a Zoom meeting window open right now?

    The Zoom app runs in the background for ages after a call, so process
    presence says nothing. A meeting has a window; the idle app does not.
    """
    script = '''
    tell application "System Events"
      if not (exists process "zoom.us") then return "no"
      tell process "zoom.us"
        repeat with w in windows
          set n to name of w
          if n contains "Zoom Meeting" or n contains "Meeting with" ¬
             or n is "Zoom Webinar" then return "yes"
        end repeat
      end tell
      return "no"
    end tell
    '''
    try:
        out = subprocess.run(["osascript", "-e", script], capture_output=True,
                             text=True, timeout=15)
    except subprocess.TimeoutExpired:
        return None
    if out.returncode != 0:
        # Usually means Accessibility permission has not been granted yet.
        return None
    return out.stdout.strip() == "yes"


def notify(minutes):
    """A notification that opens the portal when clicked.

    terminal-notifier makes the whole banner clickable, which is the point.
    Without it fall back to osascript, which can only speak - so in that
    case the URL is printed where the teacher can find it.
    """
    title = "Lesson finished"
    body = (f"{minutes} minutes with your student. Write up what to set for "
            f"homework while it is fresh.")
    if subprocess.run(["which", "terminal-notifier"],
                      capture_output=True).returncode == 0:
        subprocess.run(["terminal-notifier", "-title", title, "-message", body,
                        "-open", PORTAL, "-sound", "default"], check=False)
        return
    subprocess.run(["osascript", "-e",
                    f'display notification "{body}" with title "{title}"'],
                   check=False)
    print(f"  open {PORTAL}", flush=True)


def watch():
    print("watching for Zoom meetings (nothing is recorded)", flush=True)
    was_in = False
    started = None
    warned = False
    while True:
        now = in_meeting()
        if now is None:
            if not warned:
                print("cannot read windows - grant Accessibility to your "
                      "terminal in System Settings > Privacy & Security",
                      flush=True)
                warned = True
            time.sleep(POLL)
            continue
        warned = False
        if now and not was_in:
            started = time.time()
            print("meeting started", flush=True)
        elif was_in and not now:
            length = time.time() - (started or time.time())
            minutes = int(length // 60)
            print(f"meeting ended after {minutes} min", flush=True)
            if length >= MIN_MEETING:
                notify(minutes)
            started = None
        was_in = now
        time.sleep(POLL)


def install():
    os.makedirs(os.path.dirname(PLIST), exist_ok=True)
    plist = {
        "Label": LABEL,
        "ProgramArguments": [sys.executable, os.path.abspath(__file__)],
        "RunAtLoad": True,
        "KeepAlive": True,
        "StandardOutPath": f"/tmp/{LABEL}.log",
        "StandardErrorPath": f"/tmp/{LABEL}.log",
        "EnvironmentVariables": {"TEACHER_PORTAL": PORTAL},
    }
    with open(PLIST, "wb") as fh:
        plistlib.dump(plist, fh)
    subprocess.run(["launchctl", "unload", PLIST], capture_output=True)
    subprocess.run(["launchctl", "load", PLIST], check=False)
    print(f"installed -> {PLIST}")
    print("it will start at login. Logs: /tmp/" + LABEL + ".log")
    print("\nTwo things to grant, both one-time:")
    print("  System Settings > Privacy & Security > Accessibility: add your")
    print("    terminal (or Python) so it can see window titles")
    print("  brew install terminal-notifier   (optional; makes the banner")
    print("    clickable so it opens the portal)")


def uninstall():
    subprocess.run(["launchctl", "unload", PLIST], capture_output=True)
    if os.path.exists(PLIST):
        os.unlink(PLIST)
    print("removed")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--install", action="store_true")
    ap.add_argument("--uninstall", action="store_true")
    ap.add_argument("--test", action="store_true",
                    help="fire the notification once and exit")
    args = ap.parse_args()
    if args.install:
        return install()
    if args.uninstall:
        return uninstall()
    if args.test:
        notify(52)
        return
    watch()


if __name__ == "__main__":
    main()
