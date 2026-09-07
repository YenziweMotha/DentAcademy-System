"""AI experience-chat services (channel-agnostic)."""

__all__ = [
    "process_incoming_message",
    "get_or_create_active_conversation",
    "create_escalation_if_needed",
    "update_escalation_status",
]


def __getattr__(name):
    if name in (
        "process_incoming_message",
        "get_or_create_active_conversation",
    ):
        from services.ai import chatbot_service

        return getattr(chatbot_service, name)
    if name in ("create_escalation_if_needed", "update_escalation_status"):
        from services.ai import escalation_service

        return getattr(escalation_service, name)
    raise AttributeError(name)

