"""Safe static evaluation of print expressions from AST without executing code.

User code is NEVER executed on the host system.
Only literal constants and pure basic operations on constants are evaluated statically.
"""

import ast
from typing import Any, List, Optional, Tuple


MAX_STATIC_STR_LEN = 2000
MAX_STATIC_OUTPUT_LINES = 50
MAX_STATIC_TOTAL_CHARS = 5000
MAX_EVAL_DEPTH = 20


def _eval_const_node(node: ast.AST, depth: int = 0) -> Tuple[bool, Any]:
    """Statically evaluate an AST node if and only if it consists entirely of literals."""
    if depth > MAX_EVAL_DEPTH:
        return False, None

    if isinstance(node, ast.Constant):
        if isinstance(node.value, str) and len(node.value) > MAX_STATIC_STR_LEN:
            return False, None
        return True, node.value

    if isinstance(node, ast.UnaryOp):
        ok, val = _eval_const_node(node.operand, depth + 1)
        if ok:
            if isinstance(node.op, ast.UAdd) and isinstance(val, (int, float)):
                return True, +val
            if isinstance(node.op, ast.USub) and isinstance(val, (int, float)):
                return True, -val
            if isinstance(node.op, ast.Not):
                return True, not val

    if isinstance(node, ast.BinOp):
        ok_l, val_l = _eval_const_node(node.left, depth + 1)
        ok_r, val_r = _eval_const_node(node.right, depth + 1)
        if ok_l and ok_r:
            if isinstance(node.op, ast.Add):
                if isinstance(val_l, str) and isinstance(val_r, str):
                    if len(val_l) + len(val_r) <= MAX_STATIC_STR_LEN:
                        return True, val_l + val_r
                    return False, None
                if isinstance(val_l, (int, float)) and isinstance(val_r, (int, float)):
                    return True, val_l + val_r
            elif isinstance(node.op, ast.Sub):
                if isinstance(val_l, (int, float)) and isinstance(val_r, (int, float)):
                    return True, val_l - val_r
            elif isinstance(node.op, ast.Mult):
                if isinstance(val_l, (int, float)) and isinstance(val_r, (int, float)):
                    return True, val_l * val_r
                # String multiplication: strictly bound before allocating
                if isinstance(val_l, str) and isinstance(val_r, int):
                    if 0 <= val_r <= 100 and (len(val_l) * val_r) <= MAX_STATIC_STR_LEN:
                        return True, val_l * val_r
                    return False, None
                if isinstance(val_l, int) and isinstance(val_r, str):
                    if 0 <= val_l <= 100 and (val_l * len(val_r)) <= MAX_STATIC_STR_LEN:
                        return True, val_l * val_r
                    return False, None
            elif isinstance(node.op, ast.Div):
                if isinstance(val_l, (int, float)) and isinstance(val_r, (int, float)) and val_r != 0:
                    return True, val_l / val_r
            elif isinstance(node.op, ast.FloorDiv):
                if isinstance(val_l, (int, float)) and isinstance(val_r, (int, float)) and val_r != 0:
                    return True, val_l // val_r
            elif isinstance(node.op, ast.Mod):
                if isinstance(val_l, (int, float)) and isinstance(val_r, (int, float)) and val_r != 0:
                    return True, val_l % val_r

    if isinstance(node, ast.JoinedStr):
        # f-strings with constants
        parts = []
        cur_len = 0
        for part in node.values:
            if isinstance(part, ast.Constant):
                s = str(part.value)
                cur_len += len(s)
                if cur_len > MAX_STATIC_STR_LEN:
                    return False, None
                parts.append(s)
            elif isinstance(part, ast.FormattedValue):
                ok, val = _eval_const_node(part.value, depth + 1)
                if ok:
                    s = str(val)
                    cur_len += len(s)
                    if cur_len > MAX_STATIC_STR_LEN:
                        return False, None
                    parts.append(s)
                else:
                    return False, None
            else:
                return False, None
        return True, "".join(parts)

    if isinstance(node, (ast.List, ast.Tuple)):
        items = []
        for elt in node.elts:
            ok, val = _eval_const_node(elt, depth + 1)
            if not ok:
                return False, None
            items.append(val)
        return True, tuple(items) if isinstance(node, ast.Tuple) else items

    return False, None


def safe_infer_python_output(tree: ast.AST) -> str:
    """Safely infer the expected console output of a Python AST without executing it."""
    # Check if there are any print calls anywhere in the AST
    all_calls = [
        node for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "print"
    ]
    if not all_calls:
        return "None (this code snippet contains no console print statements)."

    # Collect top-level print statements executed in linear order
    top_level_stmts: List[ast.stmt] = []
    if isinstance(tree, ast.Module):
        top_level_stmts = tree.body
    elif hasattr(tree, "body") and isinstance(tree.body, list):
        top_level_stmts = tree.body

    top_level_prints: List[ast.Call] = []
    for stmt in top_level_stmts:
        if isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Call):
            if isinstance(stmt.value.func, ast.Name) and stmt.value.func.id == "print":
                top_level_prints.append(stmt.value)

    if not top_level_prints:
        return (
            "None (print statements reside inside function or class definitions "
            "that require runtime invocation)."
        )

    output_lines: List[str] = []
    for call in top_level_prints:
        arg_values = []
        can_eval_all = True
        for arg in call.args:
            ok, val = _eval_const_node(arg, depth=0)
            if ok:
                arg_values.append(str(val))
            else:
                can_eval_all = False
                break

        if can_eval_all:
            sep = " "
            for kw in call.keywords:
                if kw.arg == "sep":
                    ok, val = _eval_const_node(kw.value, depth=0)
                    if ok and isinstance(val, str):
                        sep = val
            output_lines.append(sep.join(arg_values))
            if len(output_lines) >= MAX_STATIC_OUTPUT_LINES:
                output_lines.append("... (truncated static output limit)")
                break
        else:
            return (
                "Calls print(...), but output values depend on runtime variables. "
                "(Code was not executed on the host system for security)."
            )

    if output_lines:
        full_output = "\n".join(output_lines)
        if len(full_output) > MAX_STATIC_TOTAL_CHARS:
            full_output = full_output[:MAX_STATIC_TOTAL_CHARS] + "\n... (truncated static output limit)"
        return full_output

    return "No static output could be determined."
