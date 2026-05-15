// メンター（PIN・設定）API クライアント
// サーバ実装: functions/api/auth/mentor/* + functions/api/mentor/config.js

import { apiGet, apiPost, apiPatch } from '../apiClient.js';

// 初回セットアップ完了状態
export const getStatus = () =>
  apiGet('/auth/mentor/status').then((d) => !!d.initialized);

// 初回 PIN 設定（PLACEHOLDER 状態のときのみ受け付け。同時にセッション発行）
export const initPin = (pin) => apiPost('/auth/mentor/init', { pin });

// PIN ログイン（セッション発行）
export const login = (pin) => apiPost('/auth/mentor', { pin });

// PIN 変更（要セッション or 旧 PIN）
export const changePin = ({ pin, newPin }) =>
  apiPost('/auth/mentor/pin', { pin, newPin });

// リベンジ設定（認証不要 GET）
export const getConfig = () => apiGet('/mentor/config');

// リベンジ設定 更新（要セッション）
export const updateConfig = (patch) => apiPatch('/mentor/config', patch);
