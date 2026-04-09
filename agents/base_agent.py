"""
Base Agent — all 11 agents inherit from this.
Uses Claude's native tool use API for genuine agentic behavior:
  - Claude decides which tools to call, in what order, and how many times
  - Loop continues until Claude stops calling tools (stop_reason == "end_turn")
  - Max iterations guard prevents runaway loops
"""

import os
import json
from abc import ABC, abstractmethod
from anthropic import Anthropic
from core.tool_executor import execute_tool


class BaseAgent(ABC):

    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.model = "claude-sonnet-4-6"

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def role(self) -> str:
        pass

    @abstractmethod
    def run(self, credit_state: dict) -> dict:
        pass

    def run_agentic_loop(
        self,
        system_prompt: str,
        initial_message: str,
        tools: list,
        max_iterations: int = 10,
    ) -> str:
        """
        Run the Claude tool-use agentic loop.

        Claude receives the task and a set of tools. It autonomously decides:
          - Which tools to call
          - In what order
          - Whether to call the same tool multiple times with different inputs
          - When it has gathered enough information to produce a final answer

        The loop exits when Claude issues stop_reason == "end_turn" (no more tool calls).
        Returns the final text content of Claude's last message.
        """
        messages = [{"role": "user", "content": initial_message}]

        for iteration in range(max_iterations):
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=system_prompt,
                tools=tools,
                messages=messages,
            )

            # Claude is done — extract final text
            if response.stop_reason == "end_turn":
                for block in response.content:
                    if hasattr(block, "text"):
                        return block.text
                return ""

            # Claude wants to call tools
            if response.stop_reason == "tool_use":
                # Append Claude's response (with tool_use blocks) to conversation
                messages.append({"role": "assistant", "content": response.content})

                # Execute every tool call Claude requested
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        result = execute_tool(block.name, block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result,
                        })

                # Feed results back to Claude for next iteration
                messages.append({"role": "user", "content": tool_results})

        # Max iterations reached — return whatever text Claude last produced
        for block in response.content:
            if hasattr(block, "text"):
                return block.text
        return ""

    def run_agentic_loop_json(
        self,
        system_prompt: str,
        initial_message: str,
        tools: list,
        max_iterations: int = 10,
    ) -> dict:
        """
        Run the agentic loop and parse the final response as JSON.
        Claude is instructed to output valid JSON as its final message.
        """
        json_system = (
            system_prompt
            + "\n\nIMPORTANT: After you have gathered all the data you need using tools, "
            "your FINAL response must be valid JSON only — no explanation, no markdown fences."
        )
        raw = self.run_agentic_loop(
            system_prompt=json_system,
            initial_message=initial_message,
            tools=tools,
            max_iterations=max_iterations,
        )
        try:
            clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            return json.loads(clean)
        except json.JSONDecodeError:
            return {"raw_response": raw, "parse_error": True}
