package com.safesafar.telephony;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.provider.CallLog;
import android.telephony.TelephonyManager;


import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

/**
 * Two read-only questions the SOS call chain needs answered:
 *  - getCallState(): is the phone idle, ringing, or in a call (dialing counts as in a call)?
 *  - findOutgoingCall(number, sinceMs): was there an outgoing call to this number, and how long did it last?
 * It never dials or hangs up anything.
 */
public class SafeSafarTelephonyModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext ctx;

    public SafeSafarTelephonyModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.ctx = reactContext;
    }

    @Override
    public String getName() {
        return "SafeSafarTelephony";
    }

    private boolean has(String permission) {
        return ctx.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED;
    }

    /** Resolves "idle", "ringing" or "offhook". Rejects with E_PERMISSION if READ_PHONE_STATE is missing. */
    @ReactMethod
    public void getCallState(Promise promise) {
        try {
            if (!has(Manifest.permission.READ_PHONE_STATE)) {
                promise.reject("E_PERMISSION", "READ_PHONE_STATE not granted");
                return;
            }
            TelephonyManager tm = (TelephonyManager) ctx.getSystemService(Context.TELEPHONY_SERVICE);
            if (tm == null) {
                promise.reject("E_UNAVAILABLE", "no TelephonyManager");
                return;
            }
            @SuppressWarnings("deprecation")
            int state = tm.getCallState();
            String out = "idle";
            if (state == TelephonyManager.CALL_STATE_RINGING) out = "ringing";
            else if (state == TelephonyManager.CALL_STATE_OFFHOOK) out = "offhook";
            promise.resolve(out);
        } catch (Exception e) {
            promise.reject("E_STATE", e.getMessage(), e);
        }
    }

    /**
     * Newest outgoing call logged at or after sinceMs whose number ends with the same last 9 digits
     * (so +91 98765 43210 and 098765 43210 match). Resolves { found, durationSec }.
     * Rejects with E_PERMISSION if READ_CALL_LOG is missing.
     */
    @ReactMethod
    public void findOutgoingCall(String number, double sinceMs, Promise promise) {
        Cursor c = null;
        try {
            if (!has(Manifest.permission.READ_CALL_LOG)) {
                promise.reject("E_PERMISSION", "READ_CALL_LOG not granted");
                return;
            }
            String want = lastDigits(number, 9);
            c = ctx.getContentResolver().query(
                    CallLog.Calls.CONTENT_URI,
                    new String[]{CallLog.Calls.NUMBER, CallLog.Calls.DURATION, CallLog.Calls.DATE},
                    CallLog.Calls.TYPE + " = ? AND " + CallLog.Calls.DATE + " >= ?",
                    new String[]{String.valueOf(CallLog.Calls.OUTGOING_TYPE), String.valueOf((long) sinceMs)},
                    CallLog.Calls.DATE + " DESC");
            WritableMap out = Arguments.createMap();
            out.putBoolean("found", false);
            out.putInt("durationSec", 0);
            while (c != null && c.moveToNext()) {
                String n = c.getString(0);
                if (want.length() > 0 && lastDigits(n, 9).equals(want)) {
                    out.putBoolean("found", true);
                    out.putInt("durationSec", c.getInt(1));
                    break;
                }
            }
            promise.resolve(out);
        } catch (Exception e) {
            promise.reject("E_CALL_LOG", e.getMessage(), e);
        } finally {
            if (c != null) c.close();
        }
    }

    private static String lastDigits(String s, int n) {
        if (s == null) return "";
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (ch >= '0' && ch <= '9') b.append(ch);
        }
        String d = b.toString();
        return d.length() <= n ? d : d.substring(d.length() - n);
    }
}
