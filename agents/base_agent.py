"""
Base Agent — all 11 agents inherit from this.
Uses Claude's native tool use API for genuine agentic behavior:
  - Claude decides which tools to call, in what order, and how many times
  - Loop continues until Claude stops calling tools (stop_reason == "end_turn")
  - Max iterations guard prevents runaway loops
"""

import os
import json
import time
from abc import ABC, abstractmethod
from anthropic import Anthropic
from core.tool_executor import execute_tool
from core.credit_state import log_agent, log_audit_trace

# Pricing for claude-sonnet-4-6 (USD per token)
_INPUT_COST_PER_TOKEN  = 3.00  / 1_000_000   # $3.00 / MTok
_OUTPUT_COST_PER_TOKEN = 15.00 / 1_000_000   # $15.00 / MTok

# Why claude-sonnet-4-6 was chosen for each agent step
_MODEL_RATIONALE = {
    "Financial Analyst":    "Sonnet 4.6 — structured 3-yr financial table extraction; Opus adds 3x cost without accuracy gain on well-formatted PDFs",
    "EBITDA Analyst":       "Sonnet 4.6 — add-back categorization with defined verdict schema; consistent JSON output prioritised over reasoning depth",
    "Commercial Analyst":   "Sonnet 4.6 — CIM narrative synthesis into structured output; adequate reasoning depth for business quality assessment",
    "Legal Analyst":        "Sonnet 4.6 — covenant and capital structure extraction; well-defined schema makes this a structured extraction task",
    "Industry Benchmarker": "Sonnet 4.6 — sector comparison lookup; lightweight structured output, Haiku considered but Sonnet gives better calibration",
    "Credit Modeler":       "Sonnet 4.6 — financial ratio calculation; math is deterministic, model choice doesn't affect arithmetic accuracy",
    "Stress Tester":        "Sonnet 4.6 — scenario simulation with defined stress parameters; structured output with known downside cases",
    "Risk Scorer":          "Sonnet 4.6 — 0-100 risk quantification against defined rubric; calibrated scoring task, not open-ended reasoning",
    "Covenant Structurer":  "Sonnet 4.6 — covenant template selection by loan type and risk score; rule-based matching",
    "Credit Underwriter":   "Sonnet 4.6 — serviceability synthesis; structured aggregation of prior agent outputs",
    "IC Memo Writer":       "Sonnet 4.6 — long-form IC memo synthesis; Opus considered but Sonnet 4.6 produces equally coherent memos at 3x lower cost",
    "News Intelligence":    "Sonnet 4.6 — news summarisation for daily monitoring; speed and cost matter at portfolio scale",
    "Sentiment Scorer":     "Sonnet 4.6 — sentiment classification; Haiku considered but Sonnet gives better signal calibration",
    "Early Warning":        "Sonnet 4.6 — multi-signal anomaly detection; moderate reasoning complexity, Sonnet optimal cost/quality",
    "Portfolio Monitor":    "Sonnet 4.6 — quarterly portfolio summary from structured inputs; deterministic aggregation task",
    "Covenant Compliance":  "Sonnet 4.6 — covenant breach detection against thresholds; semi-deterministic classification",
    "Rating Reviewer":      "Sonnet 4.6 — rating migration trigger assessment; semi-structured criteria matching",
    "_default":             "Sonnet 4.6 — default for all pipeline steps; optimal cost/quality ratio for structured JSON extraction in private credit workflow",
}


class BaseAgent(ABC):

    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.model = "claude-sonnet-4-6"
        self._last_trace: dict = {}   # populated by run_agentic_loop; read by _log_and_audit

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

        _start      = time.monotonic()
        _input_tok  = 0
        _output_tok = 0
        _iterations = 0

        for iteration in range(max_iterations):
            _iterations += 1
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=system_prompt,
                tools=tools,
                messages=messages,
            )

            # Accumulate token usage across all loop iterations
            if hasattr(response, "usage") and response.usage:
                _input_tok  += getattr(response.usage, "input_tokens",  0)
                _output_tok += getattr(response.usage, "output_tokens", 0)

            # Claude is done — extract final text
            if response.stop_reason == "end_turn":
                self._last_trace = _build_trace(
                    self.name, self.model, _start, _input_tok, _output_tok, _iterations
                )
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

        # Max iterations reached — store what we have and return last text
        self._last_trace = _build_trace(
            self.name, self.model, _start, _input_tok, _output_tok, _iterations
        )
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

    def run_agentic_loop_json_validated(
        self,
        system_prompt: str,
        initial_message: str,
        tools: list,
        credit_state: dict,
        max_iterations: int = 10,
    ) -> dict:
        """
        Run the agentic loop, validate the JSON output against this agent's
        registered output contract, and retry once if the contract is violated.

        Validation failures are logged to credit_state["validation_failures"].
        If validation still fails after retry, the partial result is returned
        with a validation_error key — the pipeline is never blocked.
        """
        from core.schemas import validate_agent_output
        from core.credit_state import log_validation_failure, add_routing_note

        result = self.run_agentic_loop_json(system_prompt, initial_message, tools, max_iterations)
        is_valid, errors = validate_agent_output(self.name, result)

        if not is_valid:
            log_validation_failure(credit_state, self.name, errors, stage="output")
            add_routing_note(
                credit_state,
                f"Output contract violation for {self.name} — retrying. Issues: {errors}",
            )
            result = self.run_agentic_loop_json(system_prompt, initial_message, tools, max_iterations)
            is_valid_retry, errors_retry = validate_agent_output(self.name, result)
            if not is_valid_retry:
                log_validation_failure(credit_state, self.name, errors_retry, stage="output_retry")
                add_routing_note(
                    credit_state,
                    f"Output contract still invalid after retry for {self.name}: {errors_retry}",
                )
                result["validation_error"] = errors_retry

        return result

    def _log_and_audit(self, credit_state: dict) -> dict:
        """
        Drop-in replacement for log_agent(credit_state, self.name).
        Logs agent completion AND appends a per-step audit trace entry.
        """
        credit_state = log_agent(credit_state, self.name)
        if self._last_trace:
            credit_state = log_audit_trace(credit_state, self._last_trace)
            self._last_trace = {}
        return credit_state


def _build_trace(agent_name: str, model: str, start: float,
                 input_tok: int, output_tok: int, iterations: int) -> dict:
    """Construct a per-agent audit trace entry."""
    latency_ms  = round((time.monotonic() - start) * 1000)
    cost_usd    = round(input_tok * _INPUT_COST_PER_TOKEN + output_tok * _OUTPUT_COST_PER_TOKEN, 5)
    rationale   = _MODEL_RATIONALE.get(agent_name, _MODEL_RATIONALE["_default"])
    return {
        "agent":            agent_name,
        "model":            model,
        "model_rationale":  rationale,
        "latency_ms":       latency_ms,
        "iterations":       iterations,
        "tokens": {
            "input":  input_tok,
            "output": output_tok,
            "total":  input_tok + output_tok,
        },
        "cost_usd":         cost_usd,
        "timestamp":        __import__("datetime").datetime.now().isoformat(),
    }
