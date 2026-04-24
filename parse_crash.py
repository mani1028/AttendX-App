import json
import sys

with open(sys.argv[1]) as f:
    lines = f.readlines()
    # The file has a 1-line JSON metadata header, then a multi-line JSON payload.
    # Join everything after the first line.
    payload = "".join(lines[1:])
    data = json.loads(payload)
    
print(f"Exception Type: {data.get('exception', {}).get('type')}")
print(f"Termination Reason: {data.get('termination', {}).get('indicator')}")
print(f"Crashed Thread: {data.get('faultingThread')}")
print("Last Exception Backtrace:")
for i, frame in enumerate(data.get('lastExceptionBacktrace', [])):
    if i >= 15: break
    print(f"  {i}: {frame.get('symbol')} + {frame.get('symbolLocation')}")
