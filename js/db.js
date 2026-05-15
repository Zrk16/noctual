(function () {
  const onLogin = window.location.pathname.endsWith('login.html');
  if (!onLogin) document.body.style.visibility = 'hidden';

  window.DB = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

  DB.auth.getSession().then(({ data: { session } }) => {
    if (!session && !onLogin) {
      location.replace('/login.html');
    } else if (session && onLogin) {
      location.replace('/index.html');
    } else {
      document.body.style.visibility = '';
    }
  });

  DB.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && onLogin) location.replace('/index.html');
    if (event === 'SIGNED_OUT' && !onLogin) location.replace('/login.html');
  });

  window.signOut = () => DB.auth.signOut().then(() => location.replace('/login.html'));
})();
