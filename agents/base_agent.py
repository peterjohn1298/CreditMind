"""
Base Agent — all 11 agents inherit from this class.
Provides Claude API access and a standard run() interface.
"""

import os
import json
from abc import ABC, abstractmethod
from anthropic import Anthropic


class BaseAgent(ABC):
    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.model = "claude-sonnet-4-6"

    @property
    @abstractmethod
    def name(self) -> str:
        """Agent display name."""
        pass

    @property
    @abstractmethod
    def role(self) -> str:
        """System prompt role description."""
        pass

    @abstractmethod
    def run(self, credit_state: dict) -> dict:
        """
        Execute agent logic. Receives full credit_state, returns updated credit_state.
        Every agent must return the full state — never a partial dict.
        """
        pass

    def call_claude(self, system_prompt: str, user_message: str, max_tokens: int = 4096) -> str:
        """Make a Claude API call and return the text response."""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text

    def call_claude_json(self, system_prompt: str, user_message: str, max_tokens: int = 4096) -> dict:
        """Call Claude and parse JSON response. Returns empty dict on parse failure."""
        raw = self.call_claude(
            system_prompt=system_prompt + "\n\nYou MUST respond with valid JSON only. No explanation, no markdown.",
            user_message=user_message,
            max_tokens=max_tokens,
        )
        try:
            # Strip markdown code fences if present
            clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            return json.loads(clean)
        except json.JSONDecodeError:
            return {"raw_response": raw, "parse_error": True}
