import React, { useState } from 'react';

function SettingsPanel({ settings, setSettings }) {
  const [activeTab, setActiveTab] = useState('general');

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="settings-panel flex h-screen">
      {/* 왼쪽 사이드바 (탭 내비게이션) */}
      <div className="w-64 shadow-lg">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">설정</h3>
          <nav className="space-y-2">
            <button
              className={`w-full text-left px-4 py-2 rounded ${activeTab === 'general' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
              onClick={() => setActiveTab('general')}
            >
              일반
            </button>
            <button
              className={`w-full text-left px-4 py-2 rounded ${activeTab === 'storage' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
              onClick={() => setActiveTab('storage')}
            >
              저장 경로
            </button>
            <button
              className={`w-full text-left px-4 py-2 rounded ${activeTab === 'appearance' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
              onClick={() => setActiveTab('appearance')}
            >
              테마
            </button>
            <button
              className={`w-full text-left px-4 py-2 rounded ${activeTab === 'sound' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
              onClick={() => setActiveTab('sound')}
            >
              알림 사운드
            </button>
          </nav>
        </div>
      </div>

      {/* 오른쪽 메인 콘텐츠 */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="shadow-lg rounded-lg p-6">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">알림 지속 시간 (ms):</label>
                <input
                  type="number"
                  value={settings.notificationDuration || 5000}
                  onChange={(e) => updateSetting('notificationDuration', parseInt(e.target.value))}
                  className="mt-1 p-2 border rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">파일 자동 수락:</label>
                <input
                  type="checkbox"
                  checked={settings.autoAccept || false}
                  onChange={(e) => updateSetting('autoAccept', e.target.checked)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">알림 비활성화:</label>
                <input
                  type="checkbox"
                  checked={settings.disableNotifications || false}
                  onChange={(e) => updateSetting('disableNotifications', e.target.checked)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">대역폭 제한 (KB/s):</label>
                <input
                  type="number"
                  value={settings.bandwidthLimit || 0}
                  onChange={(e) => updateSetting('bandwidthLimit', parseInt(e.target.value))}
                  className="mt-1 p-2 border rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">자동 업데이트 확인:</label>
                <input
                  type="checkbox"
                  checked={settings.autoUpdateCheck || true}
                  onChange={(e) => updateSetting('autoUpdateCheck', e.target.checked)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">최대 파일 크기 (GB):</label>
                <input
                  type="number"
                  value={settings.maxFileSize || 10}
                  onChange={(e) => updateSetting('maxFileSize', parseInt(e.target.value))}
                  className="mt-1 p-2 border rounded w-full"
                />
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">저장 경로:</label>
                <input
                  type="text"
                  value={settings.savePath || ''}
                  onChange={(e) => updateSetting('savePath', e.target.value)}
                  className="mt-1 p-2 border rounded w-full"
                  readOnly
                />
                <button className="mt-2 p-2 text-white rounded">경로 변경</button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">임시 저장 경로:</label>
                <input
                  type="text"
                  value={settings.tempSavePath || ''}
                  onChange={(e) => updateSetting('tempSavePath', e.target.value)}
                  className="mt-1 p-2 border rounded w-full"
                  readOnly
                />
                <button className="mt-2 p-2 text-white rounded">임시 경로 변경</button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">파일 자동 정리:</label>
                <input
                  type="checkbox"
                  checked={settings.autoOrganize || false}
                  onChange={(e) => updateSetting('autoOrganize', e.target.checked)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">저장 경로 암호화:</label>
                <input
                  type="checkbox"
                  checked={settings.pathEncryption || false}
                  onChange={(e) => updateSetting('pathEncryption', e.target.checked)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">저장 경로 동기화:</label>
                <input
                  type="checkbox"
                  checked={settings.pathSync || false}
                  onChange={(e) => updateSetting('pathSync', e.target.checked)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">저장 경로 백업:</label>
                <input
                  type="checkbox"
                  checked={settings.pathBackup || false}
                  onChange={(e) => updateSetting('pathBackup', e.target.checked)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">경로 권한:</label>
                <select
                  value={settings.pathPermissions || 'rw'}
                  onChange={(e) => updateSetting('pathPermissions', e.target.value)}
                  className="mt-1 p-2 border rounded w-full"
                >
                  <option value="ro">읽기 전용</option>
                  <option value="rw">읽기/쓰기</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">경로 태그 (쉼표로 구분):</label>
                <input
                  type="text"
                  value={settings.pathTags || ''}
                  onChange={(e) => updateSetting('pathTags', e.target.value)}
                  className="mt-1 p-2 border rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">저장 경로 검색:</label>
                <input
                  type="text"
                  value={settings.searchPathQuery || ''}
                  onChange={(e) => updateSetting('searchPathQuery', e.target.value)}
                  className="mt-1 p-2 border rounded w-full"
                />
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">기본 테마:</label>
                <select
                  value={settings.defaultTheme || 'dark'}
                  onChange={(e) => updateSetting('defaultTheme', e.target.value)}
                  className="mt-1 p-2 border rounded w-full"
                >
                  <option value="dark">다크</option>
                  <option value="light">라이트</option>
                  <option value="highContrast">고대비</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">사용자 지정 테마 - 기본 색상:</label>
                <input
                  type="color"
                  value={settings.customThemeColor || '#569cd6'}
                  onChange={(e) => updateSetting('customThemeColor', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">시간대별 테마 변경:</label>
                <input
                  type="checkbox"
                  checked={settings.timeBasedTheme || false}
                  onChange={(e) => updateSetting('timeBasedTheme', e.target.checked)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">시스템 테마 동기화:</label>
                <input
                  type="checkbox"
                  checked={settings.systemThemeSync || false}
                  onChange={(e) => updateSetting('systemThemeSync', e.target.checked)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">테마 글꼴:</label>
                <input
                  type="text"
                  value={settings.themeFont || 'Arial'}
                  onChange={(e) => updateSetting('themeFont', e.target.value)}
                  className="mt-1 p-2 border rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">테마 프리셋:</label>
                <select
                  value={settings.themePreset || 'default'}
                  onChange={(e) => updateSetting('themePreset', e.target.value)}
                  className="mt-1 p-2 border rounded w-full"
                >
                  <option value="default">기본</option>
                  <option value="modern">모던</option>
                  <option value="classic">클래식</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">배경 이미지 URL:</label>
                <input
                  type="text"
                  value={settings.backgroundImage || ''}
                  onChange={(e) => updateSetting('backgroundImage', e.target.value)}
                  className="mt-1 p-2 border rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">버튼 스타일:</label>
                <select
                  value={settings.buttonStyle || 'rounded'}
                  onChange={(e) => updateSetting('buttonStyle', e.target.value)}
                  className="mt-1 p-2 border rounded w-full"
                >
                  <option value="rounded">둥근</option>
                  <option value="square">사각</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">테마 투명도:</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.themeTransparency || 1}
                  onChange={(e) => updateSetting('themeTransparency', parseFloat(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">색상 반전:</label>
                <input
                  type="checkbox"
                  checked={settings.invertColors || false}
                  onChange={(e) => updateSetting('invertColors', e.target.checked)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">테마 밝기:</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.themeBrightness || 1}
                  onChange={(e) => updateSetting('themeBrightness', parseFloat(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">단축키 힌트 표시:</label>
                <input
                  type="checkbox"
                  checked={settings.showShortcutHints || false}
                  onChange={(e) => updateSetting('showShortcutHints', e.target.checked)}
                  className="mt-1"
                />
              </div>
              <button
                onClick={() => alert('테마 내보내기!')}
                className="mt-4 p-2 text-white rounded"
              >
                테마 내보내기
              </button>
            </div>
          )}

          {activeTab === 'sound' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">알림 사운드:</label>
                <input
                  type="text"
                  value={settings.notificationSound || ''}
                  onChange={(e) => updateSetting('notificationSound', e.target.value)}
                  className="mt-1 p-2 border rounded w-full"
                  readOnly
                />
                <button className="mt-2 p-2 text-white rounded">사운드 변경</button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">사운드 볼륨:</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.soundVolume || 1}
                  onChange={(e) => updateSetting('soundVolume', parseFloat(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">사운드 반복:</label>
                <input
                  type="checkbox"
                  checked={settings.soundRepeat || false}
                  onChange={(e) => updateSetting('soundRepeat', e.target.checked)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">사운드 페이드:</label>
                <input
                  type="checkbox"
                  checked={settings.soundFade || false}
                  onChange={(e) => updateSetting('soundFade', e.target.checked)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">사운드 지연 (ms):</label>
                <input
                  type="number"
                  value={settings.soundDelay || 0}
                  onChange={(e) => updateSetting('soundDelay', parseInt(e.target.value))}
                  className="mt-1 p-2 border rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">사운드 음소거:</label>
                <input
                  type="checkbox"
                  checked={settings.soundMute || false}
                  onChange={(e) => updateSetting('soundMute', e.target.checked)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={() => alert('설정이 저장되었습니다!')}
              className="p-2 bg-green-500 text-white rounded"
            >
              설정 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;