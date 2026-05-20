// ─────────────────────────────────────────────────────────────
// Smack UI kit — Login screen
// ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [email, setEmail] = React.useState('tom@thejellies.co');
  const [password, setPassword] = React.useState('•••••••••');
  const [isSignUp, setIsSignUp] = React.useState(false);

  return (
    <div style={{
      flex: 1, background: '#080b14', display: 'flex', flexDirection: 'column',
      paddingTop: 40, paddingInline: 28, paddingBottom: 40, height: '100%',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glow — bottom-left */}
      <div style={{
        position: 'absolute', bottom: -120, left: -80, width: 360, height: 360,
        borderRadius: '50%', background: '#2ee6d6', opacity: 0.08, filter: 'blur(60px)',
      }} />
      {/* Ambient glow — top-right */}
      <div style={{
        position: 'absolute', top: -80, right: -100, width: 280, height: 280,
        borderRadius: '50%', background: '#a06bff', opacity: 0.06, filter: 'blur(60px)',
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'stretch', position: 'relative' }}>
        {/* Mark */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <img src="../../assets/smack-mark.svg" style={{ width: 96, height: 116,
               filter: 'drop-shadow(0 0 30px #2ee6d666)' }} />
        </div>

        {/* Wordmark */}
        <div style={{
          fontSize: 48, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1,
          color: '#f3f5ff', textAlign: 'center',
          textShadow: '0 0 24px #2ee6d633',
        }}>smack</div>
        <div style={{ fontSize: 15, color: '#7a82a5', textAlign: 'center',
                      marginTop: 8, marginBottom: 40 }}>
          Your friend group, notified.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={email} onChange={setEmail} placeholder="Email" type="email" />
          <Input value={password} onChange={setPassword} placeholder="Password" type="password" />
          <Button onClick={onLogin} style={{ marginTop: 8 }}>
            {isSignUp ? 'Sign Up' : 'Log In'}
          </Button>
          <div onClick={() => setIsSignUp(!isSignUp)}
               style={{ marginTop: 16, textAlign: 'center', cursor: 'pointer' }}>
            <span style={{ color: '#7a82a5', fontSize: 14 }}>
              {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;
