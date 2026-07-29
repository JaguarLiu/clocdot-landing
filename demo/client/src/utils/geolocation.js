// 取得當前 GPS 座標
// 一般打卡：低耗電 + 接受快取，回 null 不擋打卡
// onsite 必到日：高精度 + 不接受快取，並回傳錯誤碼讓 UI 引導使用者

const DEFAULT_TIMEOUT = 8000 // 8s

export const GEO_ERROR = {
  UNSUPPORTED: 'unsupported',
  PERMISSION_DENIED: 'permission_denied',
  POSITION_UNAVAILABLE: 'position_unavailable',
  TIMEOUT: 'timeout',
}

function mapGeoError(code) {
  // PERMISSION_DENIED=1, POSITION_UNAVAILABLE=2, TIMEOUT=3
  if (code === 1) return GEO_ERROR.PERMISSION_DENIED
  if (code === 2) return GEO_ERROR.POSITION_UNAVAILABLE
  if (code === 3) return GEO_ERROR.TIMEOUT
  return GEO_ERROR.POSITION_UNAVAILABLE
}

// 一般版：失敗 → null（不擋）
export function getCurrentCoords(timeout = DEFAULT_TIMEOUT) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 60000, timeout },
    )
  })
}

// 高精度版：onsite 強制檢查用 — 不吃 cache、用 GPS、給更長 timeout
// 回傳 { coords, error }；coords 拿到 = error null；拿不到 = coords null + error 代碼
export function getCurrentCoordsAccurate(timeout = 15000) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ coords: null, error: GEO_ERROR.UNSUPPORTED })
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        error: null,
      }),
      (err) => resolve({ coords: null, error: mapGeoError(err?.code) }),
      { enableHighAccuracy: true, maximumAge: 0, timeout },
    )
  })
}

// iOS PWA 偵測（standalone mode 下使用者沒辦法在 app 內重新觸發系統權限 prompt）
export function isIOSStandalone() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || '')
  const standalone = window.navigator.standalone === true
    || window.matchMedia?.('(display-mode: standalone)').matches
  return isIOS && standalone
}

// 把 GEO_ERROR 轉成中文提示；onsite 場景下會直接被 toast 出來
export function geoErrorMessage(error) {
  switch (error) {
    case GEO_ERROR.PERMISSION_DENIED:
      return isIOSStandalone()
        ? '定位被拒絕，請到 iPhone 設定 → 隱私 → 定位服務 → ClocDot 開啟'
        : '定位被拒絕，請到瀏覽器設定重新授權後再試'
    case GEO_ERROR.POSITION_UNAVAILABLE:
      return '無法取得位置，請到戶外或開窗邊再試一次'
    case GEO_ERROR.TIMEOUT:
      return '定位逾時，訊號可能太弱，請走到窗邊再試'
    case GEO_ERROR.UNSUPPORTED:
      return '此裝置不支援定位'
    default:
      return '無法取得位置'
  }
}
