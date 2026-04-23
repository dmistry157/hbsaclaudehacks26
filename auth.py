import streamlit as st
from supabase import create_client
import os


def get_supabase():
    client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])
    session = st.session_state.get("session")
    if session:
        client.auth.set_session(session.access_token, session.refresh_token)
    return client


def render_auth_ui() -> bool:
    """Render login/signup form. Returns True if the user is authenticated."""
    if st.session_state.get("user"):
        return True

    st.subheader("Welcome to Variant Explainer")
    tab_login, tab_signup = st.tabs(["Log in", "Sign up"])

    with tab_login:
        email = st.text_input("Email", key="login_email")
        password = st.text_input("Password", type="password", key="login_password")
        if st.button("Log in", type="primary", use_container_width=True):
            try:
                res = get_supabase().auth.sign_in_with_password(
                    {"email": email, "password": password}
                )
                st.session_state["user"] = res.user
                st.session_state["session"] = res.session
                st.rerun()
            except Exception as e:
                st.error(f"Login failed: {e}")

    with tab_signup:
        email = st.text_input("Email", key="signup_email")
        password = st.text_input("Password", type="password", key="signup_password")
        if st.button("Create account", type="primary", use_container_width=True):
            try:
                get_supabase().auth.sign_up({"email": email, "password": password})
                st.success("Account created — check your email to confirm, then log in.")
            except Exception as e:
                st.error(f"Sign up failed: {e}")

    return False


def logout():
    get_supabase().auth.sign_out()
    st.session_state.pop("user", None)
    st.session_state.pop("session", None)
    st.rerun()
