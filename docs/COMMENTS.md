# Conventional Comments

Zenith uses [Conventional Comments](https://conventionalcomments.org/) to provide clear, actionable feedback in pull requests.

## Format

```
<label> [decorations]: <subject>

[discussion]
```

## 💫 Quick Reference
### Labels

| Label        | Description                                          | Example Use Case                           |
|--------------|------------------------------------------------------|-------------------------------------------|
| **praise**   | Highlight something positive                         | Great implementation, well-documented code |
| **nitpick**  | Minor suggestions that don't require changes         | Variable naming, minor style preferences   |
| **suggestion** | Propose improvements to consider                   | Alternative approaches, optimizations      |
| **issue**    | Highlight problems that need to be resolved          | Bugs, errors, critical problems            |
| **question** | Ask for clarification or explanation                 | Understanding intent, approach questions   |
| **thought**  | Share ideas or considerations for the future         | Architectural thoughts, future improvements |
| **chore**    | Simple tasks like formatting or typos                | Missing semicolons, typos, formatting      |

### Decorations

| Decoration        | Meaning                                              |
|-------------------|------------------------------------------------------|
| **(non-blocking)** | Optional feedback - PR can merge without addressing |
| **(blocking)**    | Must be addressed before merge                       |
| **(if-minor)**    | Address only if it's a quick fix                     |

## Examples

### Praise
```
praise: Excellent error handling here!

This covers all the edge cases I was worried about.
```

### Nitpick (non-blocking)
```
nitpick (non-blocking): Consider renaming `temp` to `processedData`

While `temp` works, a more descriptive name might help future maintainers.
```

### Suggestion
```
suggestion: We could use a Map instead of an Object here for better performance

Since we're doing frequent lookups, a Map would give us O(1) access time
and better memory characteristics for this use case.
```

### Issue (blocking)
```
issue (blocking): This will throw when `items` is undefined

We need to add a null/undefined check before calling `.map()` on line 42.
```

### Question
```
question: Why are we processing this data twice?

I see similar logic on lines 15 and 78. Is there a reason we can't
consolidate these operations?
```

### Thought
```
thought: This might be a good candidate for a custom hook in the future

Not for this PR, but as we add more components with similar behavior,
extracting this pattern could be valuable.
```

### Chore
```
chore (if-minor): Missing semicolon on line 23
```

## Best Practices

1. **Be specific** - Reference line numbers or code sections
2. **Be kind** - Remember there's a human on the other side
3. **Be clear** - Explain the "why" behind your feedback
4. **Use blocking sparingly** - Only for issues that truly need resolution
5. **Praise good work** - Positive feedback is valuable!

## Quick Tips for Reviewers

- Start with **praise** for good work
- Use **suggestion** for most feedback (not blocking unless critical)
- Reserve **issue (blocking)** for bugs or critical problems
- Use **question** when you don't understand something
- Mark style preferences as **nitpick (non-blocking)**

## Quick Tips for Authors

- Don't take **nitpicks** personally - they're optional
- Ask for clarification on unclear **questions** or **suggestions**
- Address all **blocking** comments before requesting re-review
- Thank reviewers for their time and feedback

---

**Remember**: The goal is constructive collaboration, not perfection. Use these conventions to make reviews clearer and more productive for everyone.
