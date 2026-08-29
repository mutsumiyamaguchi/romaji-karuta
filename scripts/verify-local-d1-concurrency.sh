#!/bin/sh
set -eu

state_dir="$(mktemp -d "${TMPDIR:-/tmp}/romaji-d1-XXXXXX")"
server_log="$state_dir/server.log"
server_pid=''
cleanup() {
  if [ -n "$server_pid" ]; then kill "$server_pid" 2>/dev/null || true; fi
  rm -rf "$state_dir"
}
trap cleanup EXIT INT TERM

wrangler d1 migrations apply romaji-karuta --local --persist-to "$state_dir" >/dev/null
wrangler d1 execute romaji-karuta --local --persist-to "$state_dir" --command \
  "INSERT INTO students(id,name,points,total_points,available_points,legacy_full_access) VALUES('verify','Verifier',0,1000,1000,1); INSERT INTO students(id,name,points,total_points,available_points,legacy_full_access) VALUES('step3-distinct','Verifier',0,0,0,1); INSERT INTO students(id,name,points,total_points,available_points,legacy_full_access) VALUES('step3-same','Verifier',0,0,0,1); INSERT INTO practice_completions(student_id,curriculum_version,unit_id,reward) VALUES ('step3-distinct','v1','youon:きゃ',90),('step3-distinct','v1','youon:しゃ',90),('step3-distinct','v1','youon:ちゃ',90),('step3-distinct','v1','youon:にゃ',90),('step3-distinct','v1','youon:ひゃ',90),('step3-distinct','v1','youon:みゃ',90),('step3-distinct','v1','youon:りゃ',90),('step3-distinct','v1','youon:ぎゃ',90),('step3-distinct','v1','youon:じゃ',90); INSERT INTO practice_completions SELECT 'step3-same',curriculum_version,unit_id,reward,completed_at FROM practice_completions WHERE student_id='step3-distinct'; INSERT INTO practice_completions(student_id,curriculum_version,unit_id,reward) VALUES('step3-same','v1','youon:びゃ',90);" >/dev/null
wrangler pages dev dist --port 8792 --persist-to "$state_dir" --binding PIN_SALT=test-only >"$server_log" 2>&1 &
server_pid=$!

i=0
until curl -fsS http://localhost:8792/api/students/verify/progress >/dev/null 2>&1; do
  i=$((i + 1)); [ "$i" -lt 30 ] || { tail -30 "$server_log"; exit 1; }
  sleep 1
done

practice='{"unitId":"seion:あ","answers":[{"promptCharacterId":"a","selectedChoiceId":"a"},{"promptCharacterId":"i","selectedChoiceId":"i"},{"promptCharacterId":"u","selectedChoiceId":"u"},{"promptCharacterId":"e","selectedChoiceId":"e"},{"promptCharacterId":"o","selectedChoiceId":"o"}],"retry":false,"mode":"h2r"}'
curl -fsS -X POST -H 'content-type: application/json' --data "$practice" http://localhost:8792/api/students/verify/practice-completions >"$state_dir/r1" & p1=$!
curl -fsS -X POST -H 'content-type: application/json' --data "$practice" http://localhost:8792/api/students/verify/practice-completions >"$state_dir/r2" & p2=$!
wait "$p1"; wait "$p2"

# Boolean claims and forged/wrong transcript pairs are rejected.
test "$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' --data '{"unitId":"seion:か","characterIds":["ka","ki","ku","ke","ko"],"allCorrect":true,"mode":"h2r"}' http://localhost:8792/api/students/verify/practice-completions)" = "422"
test "$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' --data '{"unitId":"seion:か","answers":[{"promptCharacterId":"ka","selectedChoiceId":"ki"}],"mode":"h2r"}' http://localhost:8792/api/students/verify/practice-completions)" = "422"

curl -fsS -X POST -H 'content-type: application/json' --data '{}' http://localhost:8792/api/students/verify/assessments/1/unlock >"$state_dir/u1" & u1=$!
curl -fsS -X POST -H 'content-type: application/json' --data '{}' http://localhost:8792/api/students/verify/assessments/1/unlock >"$state_dir/u2" & u2=$!
wait "$u1"; wait "$u2"

# Assessment contract is server-generated; boolean claims and out-of-order prompts fail.
attempt="$(curl -fsS -X POST -H 'content-type: application/json' --data '{}' http://localhost:8792/api/students/verify/assessments/1/start)"
test "$(printf '%s' "$attempt" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const x=JSON.parse(s);process.stdout.write(x.mode+":"+x.eligibleCharacterIds.length)})')" = "h2r:12"
test "$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' --data '{"characterId":"a","correct":true}' http://localhost:8792/api/students/verify/assessments/1/answers)" = "400"
test "$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' --data '{"attemptVersion":"v1","promptCharacterId":"na","selectedChoiceId":"na"}' http://localhost:8792/api/students/verify/assessments/1/answers)" = "409"

# Step 3 bonus: 9 completed + two distinct concurrent units, then 10 completed + same final unit.
unit_bya='{"unitId":"youon:びゃ","answers":[{"promptCharacterId":"bya","selectedChoiceId":"bya"},{"promptCharacterId":"byu","selectedChoiceId":"byu"},{"promptCharacterId":"byo","selectedChoiceId":"byo"}],"retry":false,"mode":"h2r"}'
unit_pya='{"unitId":"youon:ぴゃ","answers":[{"promptCharacterId":"pya","selectedChoiceId":"pya"},{"promptCharacterId":"pyu","selectedChoiceId":"pyu"},{"promptCharacterId":"pyo","selectedChoiceId":"pyo"}],"retry":false,"mode":"h2r"}'
curl -fsS -X POST -H 'content-type: application/json' --data "$unit_bya" http://localhost:8792/api/students/step3-distinct/practice-completions >/dev/null & s1=$!
curl -fsS -X POST -H 'content-type: application/json' --data "$unit_pya" http://localhost:8792/api/students/step3-distinct/practice-completions >/dev/null & s2=$!
wait "$s1"; wait "$s2"
curl -fsS -X POST -H 'content-type: application/json' --data "$unit_pya" http://localhost:8792/api/students/step3-same/practice-completions >/dev/null & s3=$!
curl -fsS -X POST -H 'content-type: application/json' --data "$unit_pya" http://localhost:8792/api/students/step3-same/practice-completions >/dev/null & s4=$!
wait "$s3"; wait "$s4"

progress="$(curl -fsS http://localhost:8792/api/students/verify/progress)"
node -e '
  const fs = require("fs");
  const progress = JSON.parse(process.argv[1]);
  const rewards = ["r1", "r2"].map((f) => JSON.parse(fs.readFileSync(process.argv[2] + "/" + f))).map((r) => r.awarded).sort();
  const charges = ["u1", "u2"].map((f) => JSON.parse(fs.readFileSync(process.argv[2] + "/" + f))).filter((r) => r.charged).length;
  if (progress.totalPoints !== 1100 || progress.availablePoints !== 100 || progress.practiceCompletions.length !== 1 || rewards.join(",") !== "0,100" || charges !== 1) process.exit(1);
' "$progress" "$state_dir"
step3_distinct="$(curl -fsS http://localhost:8792/api/students/step3-distinct/progress)"
step3_same="$(curl -fsS http://localhost:8792/api/students/step3-same/progress)"
node -e 'const distinct=JSON.parse(process.argv[1]); const same=JSON.parse(process.argv[2]); if(distinct.totalPoints!==190 || distinct.availablePoints!==190 || distinct.practiceCompletions.length!==11 || same.totalPoints!==100 || same.availablePoints!==100 || same.practiceCompletions.length!==11) process.exit(1)' "$step3_distinct" "$step3_same"

echo 'local D1 concurrency verifier: PASS'
