import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import QrScanner from 'qr-scanner';
import { AlertTriangle, CameraOff, CheckCircle2, Clock, Keyboard, Lock, PowerOff, RotateCcw, ScanLine, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/States';
import { useAuth } from '../../hooks/useAuth';
import { getErrorCode, getErrorMessage } from '../../services/api';
import { memberService } from '../../services/member.service';
import type { RedeemResult } from '../../types';
import { formatCredits } from '../../utils/format';
import { extractQrToken } from '../../utils/qr';

type Phase = 'starting' | 'scanning' | 'processing' | 'result' | 'camera-error';
type Outcome = { ok: true; data: RedeemResult } | { ok: false; code?: string; message: string };

/** Friendly titles for each backend error code. */
const FAILURES: Record<string, { title: string; text?: string; icon: typeof XCircle }> = {
  QR_ALREADY_USED: { title: 'QR Code Already Used', text: 'You have already redeemed this QR code.', icon: CheckCircle2 },
  QR_EXPIRED: { title: 'QR Code Expired', text: 'This QR code is no longer valid.', icon: Clock },
  INVALID_QR: { title: 'Invalid QR Code', text: "This isn't a valid CSC credit code.", icon: XCircle },
  QR_INACTIVE: { title: 'Inactive QR Code', text: 'This QR code is not active right now. Ask an organizer.', icon: PowerOff },
  UNAUTHORIZED: { title: 'Not Authorized', text: 'Please log in again.', icon: Lock },
  FORBIDDEN: { title: 'Not Authorized', text: 'Only active member accounts can redeem QR codes.', icon: Lock },
  ACCOUNT_NOT_ACTIVE: { title: 'Not Authorized', text: 'Your account is not active.', icon: Lock },
  RATE_LIMITED: { title: 'Slow down', icon: AlertTriangle },
  NETWORK_ERROR: { title: 'Connection problem', text: 'Could not reach the server. Check your internet and try again.', icon: AlertTriangle },
};

export function ScannerPage() {
  const { patchUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const busyRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('starting');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  // Captured once, so clearing ?code= from the URL can't make a re-run open the camera.
  const [openedFromLink] = useState(() => new URLSearchParams(window.location.search).has('code'));

  const startCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    setPhase('starting');
    try {
      await scanner.start();
      setPhase('scanning');
    } catch (err) {
      setCameraError(describeCameraError(err));
      setPhase('camera-error');
    }
  }, []);

  /** Sends the decoded text to the backend. The backend decides everything. */
  const redeem = useCallback(
    async (decoded: string) => {
      if (busyRef.current) return; // ignore repeated decodes of the same frame
      busyRef.current = true;
      scannerRef.current?.stop();
      setPhase('processing');
      try {
        const data = await memberService.redeemQr(extractQrToken(decoded));
        patchUser({ creditBalance: data.newBalance });
        setOutcome({ ok: true, data });
        navigator.vibrate?.(80);
      } catch (err) {
        setOutcome({ ok: false, code: getErrorCode(err), message: getErrorMessage(err) });
      } finally {
        setPhase('result');
        busyRef.current = false;
      }
    },
    [patchUser],
  );

  // The scanner callback is created once; route it through a ref to always call the latest `redeem`.
  const redeemRef = useRef(redeem);
  redeemRef.current = redeem;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const scanner = new QrScanner(video, (result) => void redeemRef.current(result.data), {
      preferredCamera: 'environment',
      // We draw our own neon frame + laser, so the library's overlays are off.
      highlightScanRegion: false,
      highlightCodeOutline: false,
      maxScansPerSecond: 8,
      returnDetailedScanResult: true,
    });
    scannerRef.current = scanner;

    // When opened from a QR link, the effect below redeems the code instead of opening the camera.
    if (!openedFromLink) void startCamera();

    return () => {
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [startCamera, openedFromLink]);

  // Opened from a QR link (phone camera app): /member/scanner?code=<token>
  useEffect(() => {
    const code = params.get('code');
    if (!code) return;
    setParams({}, { replace: true }); // don't re-submit on refresh
    void redeem(code);
  }, [params, redeem, setParams]);

  function scanAgain() {
    setOutcome(null);
    void startCamera();
  }

  function submitManual(e: FormEvent) {
    e.preventDefault();
    if (manualCode.trim()) void redeem(manualCode);
  }

  const showVideo = phase === 'starting' || phase === 'scanning';

  return (
    <div className="scanner-page">
      <header className="m-page-header">
        <h1 className="m-title">Scan QR Code</h1>
        <p className="m-subtitle">Point your camera at a CSC credit QR code.</p>
      </header>

      <div className={`scanner ${showVideo ? '' : 'is-hidden'}`}>
        <video ref={videoRef} className="scanner__video" playsInline muted />
        <div className="scanner__frame" aria-hidden>
          <span />
          <span />
          <span />
          <span />
        </div>
        {phase === 'starting' && (
          <div className="scanner__overlay">
            <Spinner size={28} />
            <p>Opening camera…</p>
          </div>
        )}
        {phase === 'scanning' && <div className="scanner__laser" aria-hidden />}
      </div>

      {phase === 'processing' && (
        <div className="result-card result-card--processing" role="status">
          <Spinner size={36} />
          <p>Checking your code…</p>
        </div>
      )}

      {phase === 'result' && outcome && <ResultCard outcome={outcome} onScanAgain={scanAgain} />}

      {phase === 'camera-error' && (
        <div className="result-card result-card--error" role="alert">
          <CameraOff size={40} aria-hidden />
          <h2 className="result-card__title">Camera unavailable</h2>
          <p>{cameraError}</p>
          <div className="result-card__actions">
            <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={() => void startCamera()}>
              Try again
            </Button>
            <Button variant="ghost" icon={<Keyboard size={16} />} onClick={() => setManualOpen(true)}>
              Enter code
            </Button>
          </div>
        </div>
      )}

      {phase !== 'processing' && (
        <div className="manual">
          {!manualOpen ? (
            <button className="link-btn" onClick={() => setManualOpen(true)}>
              <Keyboard size={16} aria-hidden /> Can't scan? Enter the code manually
            </button>
          ) : (
            <form onSubmit={submitManual} className="manual__form">
              <label htmlFor="manual-code" className="field__label">
                QR code or link
              </label>
              <div className="manual__row">
                <input
                  id="manual-code"
                  className="input"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Paste the code or link"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <Button type="submit" disabled={!manualCode.trim()}>
                  Redeem
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function ResultCard({ outcome, onScanAgain }: { outcome: Outcome; onScanAgain: () => void }) {
  if (outcome.ok) {
    const { data } = outcome;
    return (
      <div className="result-card result-card--success" role="status">
        <div className="result-card__burst" aria-hidden />
        <CheckCircle2 size={44} className="result-card__icon" aria-hidden />
        <p className="result-card__eyebrow">Success!</p>
        <p className="result-card__amount">+{formatCredits(data.credits)}</p>
        <p className="result-card__unit">CSC Credits</p>
        <dl className="result-card__details">
          <dt>Reason</dt>
          <dd>{data.campaign.title}</dd>
          <dt>New balance</dt>
          <dd>
            <strong>{formatCredits(data.newBalance)}</strong> CSC Credits
          </dd>
        </dl>
        <div className="result-card__actions">
          <Button icon={<ScanLine size={16} />} onClick={onScanAgain}>
            Scan another
          </Button>
          <Link to="/member/credits" className="btn btn--ghost btn--md">
            <span>View history</span>
          </Link>
        </div>
      </div>
    );
  }

  const failure = (outcome.code && FAILURES[outcome.code]) || { title: 'Something went wrong', icon: AlertTriangle };
  const Icon = failure.icon;
  return (
    <div className={`result-card result-card--error ${outcome.code === 'QR_ALREADY_USED' ? 'result-card--info' : ''}`} role="alert">
      <Icon size={44} className="result-card__icon" aria-hidden />
      <h2 className="result-card__title">{failure.title}</h2>
      <p>{failure.text ?? outcome.message}</p>
      <div className="result-card__actions">
        <Button icon={<ScanLine size={16} />} onClick={onScanAgain}>
          Scan again
        </Button>
      </div>
    </div>
  );
}

function describeCameraError(err: unknown): string {
  if (!window.isSecureContext) {
    return 'The camera only works on a secure (https://) connection. Open the site with https or on localhost.';
  }
  const name = err instanceof Error ? err.name : '';
  const text = typeof err === 'string' ? err : err instanceof Error ? err.message : '';
  if (name === 'NotAllowedError' || /permission|denied/i.test(text)) {
    return 'Camera permission was denied. Allow camera access in your browser settings, then try again.';
  }
  if (name === 'NotFoundError' || /not found|no camera/i.test(text)) {
    return 'No camera was found on this device. You can enter the code manually instead.';
  }
  if (name === 'NotReadableError') return 'The camera is being used by another app. Close it and try again.';
  return 'Could not start the camera. You can enter the code manually instead.';
}
