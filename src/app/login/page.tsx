import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <>
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-logo">🍛</div>
          <h2 className="login-title">Gurukrupa Foods</h2>
          <p className="login-sub">Sign in to continue</p>
          <LoginForm />
        </div>
      </div>
    </>
  );
}
