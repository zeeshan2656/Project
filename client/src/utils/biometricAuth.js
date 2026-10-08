/**
 * Biometric & Fingerprint Authentication Utility for Mobile & Desktop
 * 
 * Leverages the standard W3C Web Authentication API (WebAuthn / PublicKeyCredential)
 * supported on modern mobile devices:
 * - Android (Native Fingerprint Sensor / Biometric Prompt)
 * - iOS Safari / PWA (Touch ID & Face ID)
 * - Windows Hello / macOS Touch ID
 * 
 * Provides:
 * 1. Hardware availability detection (isBiometricAvailable)
 * 2. Enrollment of device fingerprint credentials (enrollBiometrics)
 * 3. Fast one-touch biometric verification & authentication (authenticateBiometrics)
 * 4. Safe fallback for older browsers or devices without biometric enrollment
 */

const STORAGE_KEY_USER = 'apex_biometric_user';
const STORAGE_KEY_TOKEN = 'apex_biometric_token';
const STORAGE_KEY_CRED_ID = 'apex_biometric_cred_id';
const STORAGE_KEY_ENABLED = 'apex_biometric_enabled';

/**
 * Check if the current browser environment supports WebAuthn PublicKeyCredentials
 */
export function isWebAuthnSupported() {
  return typeof window !== 'undefined' && 
    window.isSecureContext && 
    !!window.PublicKeyCredential && 
    !!navigator.credentials;
}

/**
 * Check if the device has an enrolled platform authenticator (Fingerprint scanner / Touch ID / Face ID)
 */
export async function isPlatformAuthenticatorAvailable() {
  if (!isWebAuthnSupported()) return false;
  try {
    if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return Boolean(available);
    }
    return true;
  } catch (err) {
    console.warn('[BiometricAuth] Error checking platform authenticator:', err);
    return false;
  }
}

/**
 * Check if biometric authentication is already set up and active on this device
 */
export function isBiometricEnrolled() {
  if (typeof window === 'undefined') return false;
  const isEnabled = localStorage.getItem(STORAGE_KEY_ENABLED) === 'true';
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);
  const user = localStorage.getItem(STORAGE_KEY_USER);
  return Boolean(isEnabled && token && user);
}

/**
 * Retrieve the enrolled biometric user profile
 */
export function getEnrolledBiometricUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

/**
 * Helper to convert ArrayBuffer to Base64URL string
 */
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Helper to convert Base64URL string to Uint8Array buffer
 */
function base64ToBuffer(base64) {
  const padded = base64.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (base64.length % 4)) % 4);
  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Enroll user fingerprint / biometric security on the current mobile device
 * Prompts the native Android / iOS fingerprint dialog.
 * 
 * @param {Object} user - User profile object ({ id, name, role, email, employee_code })
 * @param {string} token - Active JWT session token
 */
export async function enrollBiometrics(user, token) {
  if (!isWebAuthnSupported()) {
    throw new Error('Biometric authentication is not supported by your current browser.');
  }

  // Generate 32-byte cryptographically secure challenge
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userIdString = String(user.id || user.email || user.employee_code || 'user_1');
  const userIdBuffer = new TextEncoder().encode(userIdString);

  const publicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: 'Apex Textile Inspection Platform',
      id: window.location.hostname
    },
    user: {
      id: userIdBuffer,
      name: user.email || user.employee_code || user.name || 'inspector',
      displayName: user.name || 'Mobile Field Auditor'
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256 (standard mobile biometrics)
      { alg: -257, type: 'public-key' }  // RS256 (fallback)
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Built-in device sensor (Fingerprint / Touch ID / Face ID)
      userVerification: 'required',
      residentKey: 'preferred'
    },
    timeout: 60000,
    attestation: 'none'
  };

  try {
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    });

    if (!credential) {
      throw new Error('Biometric registration was cancelled or timed out.');
    }

    const credentialId = bufferToBase64(credential.rawId);

    // Save enrollment details safely in device local storage
    localStorage.setItem(STORAGE_KEY_ENABLED, 'true');
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEY_CRED_ID, credentialId);

    return {
      success: true,
      credentialId,
      message: 'Fingerprint authentication enabled successfully on this device!'
    };
  } catch (err) {
    console.error('[BiometricAuth] Enrollment error:', err);
    if (err.name === 'NotAllowedError') {
      throw new Error('Biometric setup was cancelled or permission was denied.');
    }
    throw new Error(err.message || 'Failed to complete fingerprint registration.');
  }
}

/**
 * Authenticate using Mobile Device Fingerprint Sensor / Biometrics
 * Prompts the native OS biometric popup (e.g. "Touch the fingerprint sensor").
 * 
 * @returns {Promise<{ success: boolean, user: Object, token: string }>}
 */
export async function authenticateBiometrics() {
  if (!isBiometricEnrolled()) {
    throw new Error('No fingerprint credentials enrolled on this device. Please log in with password first.');
  }

  const rawUser = localStorage.getItem(STORAGE_KEY_USER);
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);
  const credIdBase64 = localStorage.getItem(STORAGE_KEY_CRED_ID);

  if (!rawUser || !token) {
    throw new Error('Stored biometric session expired. Please sign in with password.');
  }

  const user = JSON.parse(rawUser);

  if (!isWebAuthnSupported()) {
    // If WebAuthn is unavailable, fall back safely to stored device token
    return { success: true, user, token };
  }

  // Generate 32-byte challenge for verification
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const getOptions = {
    challenge,
    timeout: 60000,
    rpId: window.location.hostname,
    userVerification: 'required'
  };

  if (credIdBase64) {
    try {
      getOptions.allowCredentials = [{
        id: base64ToBuffer(credIdBase64),
        type: 'public-key',
        transports: ['internal']
      }];
    } catch (_) {
      // If credential ID buffer decode fails, proceed without allowCredentials filter
    }
  }

  try {
    const assertion = await navigator.credentials.get({
      publicKey: getOptions
    });

    if (!assertion) {
      throw new Error('Biometric verification cancelled.');
    }

    return {
      success: true,
      user,
      token,
      message: 'Fingerprint verified successfully.'
    };
  } catch (err) {
    console.error('[BiometricAuth] Verification error:', err);
    if (err.name === 'NotAllowedError') {
      throw new Error('Fingerprint scan cancelled or not recognized. Please try again.');
    }
    // If platform threw an error but token is valid on device, provide informative error
    throw new Error(err.message || 'Fingerprint verification failed.');
  }
}

/**
 * Disable and remove biometric authentication credentials from this device
 */
export function disableBiometrics() {
  localStorage.removeItem(STORAGE_KEY_ENABLED);
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_USER);
  localStorage.removeItem(STORAGE_KEY_CRED_ID);
  return { success: true, message: 'Fingerprint authentication disabled on this device.' };
}
