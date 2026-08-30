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
  "INSERT INTO students(id,name,points,total_points,available_points,legacy_full_access) VALUES('verify','Verifier',0,1000,1000,1); INSERT INTO students(id,name,points,total_points,available_points,legacy_full_access) VALUES('step3-distinct','Verifier',0,0,0,1); INSERT INTO students(id,name,points,total_points,available_points,legacy_full_access) VALUES('step3-same','Verifier',0,0,0,1); INSERT INTO assessment_progress(student_id,step,curriculum_version,status) VALUES('step3-distinct',1,'v1','passed'),('step3-distinct',2,'v1','passed'),('step3-same',1,'v1','passed'),('step3-same',2,'v1','passed'); INSERT INTO practice_completions(student_id,curriculum_version,unit_id,reward) VALUES ('step3-distinct','v1','youon:きゃ',90),('step3-distinct','v1','youon:しゃ',90),('step3-distinct','v1','youon:ちゃ',90),('step3-distinct','v1','youon:にゃ',90),('step3-distinct','v1','youon:ひゃ',90),('step3-distinct','v1','youon:みゃ',90),('step3-distinct','v1','youon:りゃ',90),('step3-distinct','v1','youon:ぎゃ',90),('step3-distinct','v1','youon:じゃ',90); INSERT INTO practice_completions SELECT 'step3-same',curriculum_version,unit_id,reward,completed_at FROM practice_completions WHERE student_id='step3-distinct'; INSERT INTO practice_completions(student_id,curriculum_version,unit_id,reward) VALUES('step3-same','v1','youon:びゃ',90);" >/dev/null
wrangler d1 execute romaji-karuta --local --persist-to "$state_dir" --command \
  "INSERT INTO students(id,name,points,total_points,available_points,legacy_full_access) VALUES('legacy-preview','Verifier',0,500,500,1),('low-balance','Verifier',0,900,900,0),('step2-gate','Verifier',0,2000,2000,0),('step3-gate','Verifier',0,2000,2000,0); INSERT INTO assessment_progress(student_id,step,curriculum_version,status) VALUES('step2-gate',1,'v1','passed'),('step3-gate',1,'v1','passed'),('step3-gate',2,'v1','passed'); INSERT INTO practice_completions(student_id,curriculum_version,unit_id,reward) VALUES ('low-balance','v1','seion:あ',100),('low-balance','v1','seion:か',100),('low-balance','v1','seion:さ',100),('low-balance','v1','seion:た',100),('low-balance','v1','seion:な',100),('low-balance','v1','seion:は',100),('low-balance','v1','seion:ま',100),('low-balance','v1','seion:や',100),('low-balance','v1','seion:ら',100),('low-balance','v1','seion:わ',100),('step2-gate','v1','dakuon:が',125),('step2-gate','v1','dakuon:ざ',125),('step2-gate','v1','dakuon:だ',125),('step2-gate','v1','dakuon:ば',125),('step2-gate','v1','dakuon:ぱ',125),('step2-gate','v1','dakuon:小さいあ',125),('step2-gate','v1','dakuon:小さいや',125),('step3-gate','v1','youon:きゃ',90),('step3-gate','v1','youon:しゃ',90),('step3-gate','v1','youon:ちゃ',90),('step3-gate','v1','youon:にゃ',90),('step3-gate','v1','youon:ひゃ',90),('step3-gate','v1','youon:みゃ',90),('step3-gate','v1','youon:りゃ',90),('step3-gate','v1','youon:ぎゃ',90),('step3-gate','v1','youon:じゃ',90),('step3-gate','v1','youon:びゃ',90);" >/dev/null
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

# legacy先取りはアクセスできても報酬・completionを記録しない。
preview='{"unitId":"dakuon:が","answers":[{"promptCharacterId":"ga","selectedChoiceId":"ga"},{"promptCharacterId":"gi","selectedChoiceId":"gi"},{"promptCharacterId":"gu","selectedChoiceId":"gu"},{"promptCharacterId":"ge","selectedChoiceId":"ge"},{"promptCharacterId":"go","selectedChoiceId":"go"}],"retry":false,"mode":"h2r"}'
test "$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' --data "$preview" http://localhost:8792/api/students/legacy-preview/practice-completions)" = "403"
preview_progress="$(curl -fsS http://localhost:8792/api/students/legacy-preview/progress)"
node -e 'const x=JSON.parse(process.argv[1]); if(x.totalPoints!==500 || x.availablePoints!==500 || x.practiceCompletions.length!==0) process.exit(1)' "$preview_progress"

# 全unit完了済みでも残高不足ならassessment rowと残高は不変。
test "$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' --data '{}' http://localhost:8792/api/students/low-balance/assessments/1/unlock)" = "409"
low_progress="$(curl -fsS http://localhost:8792/api/students/low-balance/progress)"
node -e 'const x=JSON.parse(process.argv[1]); if(x.totalPoints!==900 || x.availablePoints!==900 || x.assessments.length!==0) process.exit(1)' "$low_progress"

# Step 2は8unit、Step 3は11unitの最後の1unitまで必要。
test "$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' --data '{}' http://localhost:8792/api/students/step2-gate/assessments/2/unlock)" = "409"
test "$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' --data '{}' http://localhost:8792/api/students/step3-gate/assessments/3/unlock)" = "409"
wrangler d1 execute romaji-karuta --local --persist-to "$state_dir" --command \
  "INSERT INTO practice_completions(student_id,curriculum_version,unit_id,reward) VALUES('step2-gate','v1','dakuon:小さいつ',125),('step3-gate','v1','youon:ぴゃ',90);" >/dev/null
step2_unlock="$(curl -fsS -X POST -H 'content-type: application/json' --data '{}' http://localhost:8792/api/students/step2-gate/assessments/2/unlock)"
step3_unlock="$(curl -fsS -X POST -H 'content-type: application/json' --data '{}' http://localhost:8792/api/students/step3-gate/assessments/3/unlock)"
node -e 'for(const raw of process.argv.slice(1)){const x=JSON.parse(raw); if(!x.charged || x.availablePoints!==1000) process.exit(1)}' "$step2_unlock" "$step3_unlock"

# 解放済みならunit/残高を再判定せず、再消費しない。
wrangler d1 execute romaji-karuta --local --persist-to "$state_dir" --command \
  "DELETE FROM practice_completions WHERE student_id='step2-gate' AND unit_id='dakuon:小さいつ'; UPDATE students SET available_points=0 WHERE id='step2-gate';" >/dev/null
step2_reentry="$(curl -fsS -X POST -H 'content-type: application/json' --data '{}' http://localhost:8792/api/students/step2-gate/assessments/2/unlock)"
node -e 'const x=JSON.parse(process.argv[1]); if(x.charged || x.availablePoints!==0 || x.status!=="unlocked") process.exit(1)' "$step2_reentry"

# ポイントだけでは解放できず、対象stepの全練習単位クリアも必要。
test "$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' --data '{}' http://localhost:8792/api/students/verify/assessments/1/unlock)" = "409"
wrangler d1 execute romaji-karuta --local --persist-to "$state_dir" --command \
  "INSERT INTO practice_completions(student_id,curriculum_version,unit_id,reward) VALUES ('verify','v1','seion:か',100),('verify','v1','seion:さ',100),('verify','v1','seion:た',100),('verify','v1','seion:な',100),('verify','v1','seion:は',100),('verify','v1','seion:ま',100),('verify','v1','seion:や',100),('verify','v1','seion:ら',100),('verify','v1','seion:わ',100);" >/dev/null

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
  if (progress.totalPoints !== 1100 || progress.availablePoints !== 100 || progress.practiceCompletions.length !== 10 || rewards.join(",") !== "0,100" || charges !== 1) process.exit(1);
' "$progress" "$state_dir"
step3_distinct="$(curl -fsS http://localhost:8792/api/students/step3-distinct/progress)"
step3_same="$(curl -fsS http://localhost:8792/api/students/step3-same/progress)"
node -e 'const distinct=JSON.parse(process.argv[1]); const same=JSON.parse(process.argv[2]); if(distinct.totalPoints!==190 || distinct.availablePoints!==190 || distinct.practiceCompletions.length!==11 || same.totalPoints!==100 || same.availablePoints!==100 || same.practiceCompletions.length!==11) process.exit(1)' "$step3_distinct" "$step3_same"

echo 'local D1 concurrency verifier: PASS'
