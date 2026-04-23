import streamlit as st
from storage import load_analyses
from agent import run_agent, build_context, TOOL_LABELS


def render_chat_page() -> None:
    st.header("Chat with your genetic health assistant")
    st.caption(
        "Ask about your results, lifestyle changes, treatment options, "
        "what to tell your family, or what questions to bring to your doctor."
    )

    try:
        analyses = load_analyses()
    except Exception:
        st.error("Could not load saved analyses. Make sure the Supabase table is set up.")
        return

    if not analyses:
        st.info(
            "No saved analyses yet. Go to **Variant Explainer**, run an analysis, "
            "and click **Save this result** first."
        )
        return

    labels = [
        f"{a['gene']} {a['variant_input']}  —  {a['created_at'][:10]}"
        for a in analyses
    ]
    idx = st.selectbox(
        "Which result do you want to discuss?",
        range(len(labels)),
        format_func=lambda i: labels[i],
    )
    selected = analyses[idx]

    history_key = f"chat_{selected['id']}"
    if history_key not in st.session_state:
        st.session_state[history_key] = []

    for msg in st.session_state[history_key]:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    if prompt := st.chat_input("Ask anything about your genetic results..."):
        st.session_state[history_key].append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        messages = [
            {"role": "user", "content": build_context(selected)},
            {
                "role": "assistant",
                "content": (
                    "Thank you — I have your complete genetic analysis in front of me. "
                    "What would you like to know?"
                ),
            },
            *st.session_state[history_key],
        ]

        with st.chat_message("assistant"):
            with st.status("Thinking...", expanded=True) as status:
                response_text = run_agent(
                    messages,
                    on_tool_call=lambda name: status.write(
                        TOOL_LABELS.get(name, f"Calling {name}...")
                    ),
                )
                status.update(label="Done", state="complete", expanded=False)
            st.markdown(response_text)

        st.session_state[history_key].append({"role": "assistant", "content": response_text})
