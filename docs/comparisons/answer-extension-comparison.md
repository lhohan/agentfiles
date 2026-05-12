# Answer Extension Comparison: sids/pi-extensions/answer vs mitsuhiko/agent-stuff/extensions/answer.ts

**Task**: agf-7zl.1 - Compare sids/pi-extensions/answer vs mitsuhiko/agent-stuff/extensions/answer.ts  
**Epic**: agf-7zl - pi: evaluate answer-question extraction extension workflow  
**Date**: 2026-05-11  
**Status**: COMPLETE

---

## Executive Summary

Both extensions provide interactive Q&A extraction for Pi, but they represent fundamentally different approaches:

- **sids/pi-extensions/answer (pi-answer)**: A **packaged, feature-rich extension** with draft persistence, configurable templates, and comprehensive settings. Published as npm package `pi-answer`.
- **mitsuhiko/agent-stuff/extensions/answer.ts**: A **single-file, minimal reference implementation** that demonstrates the core pattern without additional features.

**Recommendation**: For packaged trial, **sids/pi-extensions/answer** is the superior choice due to its comprehensive feature set and active maintenance. For a minimal reference implementation or learning purposes, **mitsuhiko/agent-stuff/extensions/answer.ts** serves as an excellent starting point.

---

## 1. Feature Set Comparison

### 1.1 Extraction Schema

| Feature | sids/pi-extensions/answer | mitsuhiko/agent-stuff/answer.ts |
|---------|--------------------------|--------------------------------|
| **Question extraction** | ✅ JSON with structured schema | ✅ JSON with basic schema |
| **Context support** | ✅ Optional context per question | ✅ Optional context per question |
| **Options support** | ✅ Multiple choice with labels & descriptions | ❌ No option support |
| **Question IDs** | ✅ Stable snake_case IDs | ❌ No ID support |
| **Headers** | ✅ Optional headers for grouping | ❌ No header support |
| **Schema validation** | ✅ Full normalization & validation | ✅ Basic parsing |

**Winner**: sids/pi-extensions/answer (significantly richer schema)

### 1.2 UI Behavior

| Feature | sids/pi-extensions/answer | mitsuhiko/agent-stuff/answer.ts |
|---------|--------------------------|--------------------------------|
| **TUI Navigation** | ✅ Tab/Shift+Tab, ↑/↓, 1-9 shortcuts | ✅ Tab/Shift+Tab, ↑/↓ |
| **Custom answers** | ✅ "Other" option with custom text | ✅ Custom text input |
| **Multi-line answers** | ✅ Shift+Enter for newlines | ❌ Single-line only |
| **Answer templates** | ✅ Configurable templates with placeholders | ❌ No templates |
| **Template cycling** | ✅ Ctrl+T to cycle through templates | ❌ Not available |
| **Confirmation dialog** | ✅ Explicit confirmation before submit | ✅ Simple confirmation |
| **Progress indicator** | ✅ Visual progress dots | ✅ Text-based progress |
| **Color theming** | ✅ Uses Pi's theme system | ✅ Custom ANSI colors |

**Winner**: sids/pi-extensions/answer (more polished UX)

### 1.3 Settings & Configuration

| Feature | sids/pi-extensions/answer | mitsuhiko/agent-stuff/answer.ts |
|---------|--------------------------|--------------------------------|
| **Extraction models** | ✅ Configurable preference list | ✅ Hardcoded fallback logic |
| **Custom system prompt** | ✅ Override extraction prompt | ❌ Hardcoded prompt |
| **Answer templates** | ✅ Multiple configurable templates | ❌ None |
| **Draft persistence** | ✅ Full draft saving & restoration | ❌ None |
| **Settings hierarchy** | ✅ Global + project-level settings | ❌ None |
| **Configuration file** | ✅ `settings.json` in agent dir | ❌ None |

**Winner**: sids/pi-extensions/answer (comprehensive configuration)

### 1.4 Draft Persistence

| Feature | sids/pi-extensions/answer | mitsuhiko/agent-stuff/answer.ts |
|---------|--------------------------|--------------------------------|
| **Draft saving** | ✅ Automatic with debounce | ❌ Not implemented |
| **Draft restoration** | ✅ Prompt to restore saved drafts | ❌ Not implemented |
| **Auto-save interval** | ✅ Configurable (default: 1000ms) | ❌ Not applicable |
| **Draft clearing** | ✅ Explicit clear functionality | ❌ Not applicable |
| **Session-based drafts** | ✅ Tied to specific assistant messages | ❌ Not applicable |

**Winner**: sids/pi-extensions/answer (full draft management)

### 1.5 Model Selection

| Feature | sids/pi-extensions/answer | mitsuhiko/agent-stuff/answer.ts |
|---------|--------------------------|--------------------------------|
| **Model preference** | ✅ Configurable extraction models | ✅ Hardcoded preference (GPT-5.3 → Haiku) |
| **Fallback logic** | ✅ Graceful fallback through preference list | ✅ Fallback to current model |
| **API key checking** | ✅ Verifies API keys before selection | ✅ Verifies API keys |
| **Default models** | ✅ OpenAI Codex, GitHub Copilot, Anthropic | ✅ OpenAI Codex, Anthropic |

**Winner**: Tie (both have good model selection, but sids is more configurable)

---

## 2. Packaging & Installation

### 2.1 Packaging Shape

| Aspect | sids/pi-extensions/answer | mitsuhiko/agent-stuff/answer.ts |
|--------|--------------------------|--------------------------------|
| **Package type** | npm package (`pi-answer`) | Single TypeScript file |
| **Install command** | `pi install npm:pi-answer` | Manual file placement |
| **Files count** | 6+ files (index.ts, utils.ts, qna-adapter.ts, tests, etc.) | 1 file (answer.ts) |
| **Dependencies** | 1 external dependency (`@siddr/pi-shared-qna`) | 0 external dependencies |
| **Peer dependencies** | Pi AI, Pi Coding Agent, Pi TUI | Pi AI, Pi Coding Agent, Pi TUI |
| **Bundle size** | ~29KB unpacked | ~15KB single file |

### 2.2 Installation Complexity

**sids/pi-extensions/answer**:
```bash
pi install npm:pi-answer
```
- One command installation
- Automatic dependency resolution
- Version pinning at package level

**mitsuhiko/agent-stuff/answer.ts**:
```bash
# Manual process:
1. Copy answer.ts to ~/.pi/agent/extensions/
2. Ensure Pi dependencies are available
3. Restart Pi
```
- Manual file management
- No version pinning
- No dependency management

**Winner**: sids/pi-extensions/answer (professional packaging)

---

## 3. Code Quality Signals

### 3.1 Code Organization

**sids/pi-extensions/answer**:
- ✅ Modular architecture (separation of concerns)
- ✅ Clear file organization (index.ts, utils.ts, qna-adapter.ts)
- ✅ TypeScript with proper types
- ✅ Comprehensive error handling
- ✅ Configuration management separated from logic
- ✅ Draft management in dedicated module

**mitsuhiko/agent-stuff/answer.ts**:
- ✅ Single-file simplicity
- ✅ Clear inline documentation
- ✅ TypeScript with proper types
- ✅ Self-contained implementation
- ❌ No separation of concerns (everything in one file)
- ❌ No modular architecture

**Winner**: sids/pi-extensions/answer (better architecture)

### 3.2 Testing

**sids/pi-extensions/answer**:
- ✅ Comprehensive test suite
- ✅ Unit tests for utilities (utils.test.ts)
- ✅ Unit tests for adapter (qna-adapter.test.ts)
- ✅ Uses Bun test framework
- ✅ High test coverage
- ✅ Tests edge cases (normalization, matching, etc.)

**mitsuhiko/agent-stuff/answer.ts**:
- ❌ No tests included
- ❌ No test infrastructure
- ❌ No test examples

**Winner**: sids/pi-extensions/answer (proper testing)

### 3.3 Documentation

**sids/pi-extensions/answer**:
- ✅ Comprehensive README.md
- ✅ Usage instructions
- ✅ Configuration examples
- ✅ Template placeholders documented
- ✅ Navigation controls documented
- ✅ CHANGELOG.md with version history
- ✅ Inline code comments

**mitsuhiko/agent-stuff/answer.ts**:
- ✅ Inline code comments
- ✅ Header documentation
- ❌ No README
- ❌ No usage instructions
- ❌ No configuration examples

**Winner**: sids/pi-extensions/answer (excellent documentation)

### 3.4 Type Safety

Both extensions:
- ✅ Use TypeScript
- ✅ Have proper type definitions
- ✅ Use interfaces for structured data
- ✅ Type-safe API calls

**Winner**: Tie

---

## 4. Trust & Maintenance Surface

### 4.1 Repository Information

| Aspect | sids/pi-extensions/answer | mitsuhiko/agent-stuff/answer.ts |
|--------|--------------------------|--------------------------------|
| **Repository** | [sids/pi-extensions](https://github.com/sids/pi-extensions) | [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff) |
| **Stars** | 11 (repository) | N/A (part of larger repo) |
| **Forks** | 3 (repository) | N/A |
| **Maintainer** | siddr (sids.reddy@gmail.com) | mitsuhiko (Armin Ronacher) |
| **License** | MIT | MIT (assumed) |
| **Last commit** | 2026-04-24 | 2026-03-? (estimated) |

### 4.2 Dependency Analysis

**sids/pi-extensions/answer**:
- **Direct dependency**: `@siddr/pi-shared-qna@^0.1.0`
- **Shared dependency purpose**: Shared TUI helpers for Q&A components
- **Shared dependency maintainer**: Same maintainer (siddr)
- **Shared dependency size**: ~29KB, 5 files
- **Pinning limitation**: Top-level package pinning doesn't fully pin transitive dependencies

**mitsuhiko/agent-stuff/answer.ts**:
- **Direct dependencies**: 0
- **Shared dependencies**: 0
- **Pinning limitation**: None (single file)

### 4.3 Security Considerations

**sids/pi-extensions/answer**:
- ⚠️ **Larger trust surface**: External dependency on `@siddr/pi-shared-qna`
- ⚠️ **Network access**: Can make API calls to configured models
- ✅ **No malicious code detected**: Code review shows clean implementation
- ⚠️ **Dependency chain**: Transitive dependencies through pi-shared-qna
- ✅ **Open source**: Fully auditable

**mitsuhiko/agent-stuff/answer.ts**:
- ✅ **Minimal trust surface**: Single file, no external dependencies
- ⚠️ **Network access**: Can make API calls to configured models
- ✅ **No malicious code detected**: Code review shows clean implementation
- ✅ **No dependency chain**: Self-contained
- ✅ **Open source**: Fully auditable

**Winner**: mitsuhiko/agent-stuff/answer.ts (smaller trust surface)

### 4.4 Maintenance Burden

**sids/pi-extensions/answer**:
- ⚠️ **Higher maintenance**: Multiple files, tests, dependencies
- ✅ **Active maintenance**: Recent commits (2026-04-24)
- ✅ **Version management**: Proper semantic versioning
- ⚠️ **Dependency updates**: Need to track pi-shared-qna updates
- ✅ **Changelog**: Maintained

**mitsuhiko/agent-stuff/answer.ts**:
- ✅ **Low maintenance**: Single file, no dependencies
- ⚠️ **Less active**: Part of larger repository, may not be primary focus
- ❌ **No version management**: No version tags for this specific file
- ✅ **No dependency updates**: Self-contained
- ❌ **No changelog**: No version history

**Winner**: mitsuhiko/agent-stuff/answer.ts (lower maintenance burden)

---

## 5. Suitability Assessment

### 5.1 For Packaged Trial

**sids/pi-extensions/answer (pi-answer)**:
- ✅ **Production-ready**: Professional packaging, comprehensive features
- ✅ **Easy installation**: One-command install via Pi
- ✅ **Feature-complete**: All expected features for Q&A extraction
- ✅ **Well-documented**: Clear usage and configuration
- ✅ **Tested**: Comprehensive test suite
- ⚠️ **Security review needed**: External dependency requires review

**Score: 9/10** - Excellent choice for packaged trial

**mitsuhiko/agent-stuff/answer.ts**:
- ❌ **Not packaged**: Manual installation required
- ❌ **Feature-limited**: Missing key features (drafts, templates, options)
- ❌ **No documentation**: No user-facing documentation
- ❌ **No tests**: No test coverage
- ✅ **Security**: Minimal trust surface

**Score: 4/10** - Not suitable for packaged trial

### 5.2 For Minimal Reference Implementation

**sids/pi-extensions/answer (pi-answer)**:
- ❌ **Over-engineered**: Too many features for reference
- ❌ **Complex**: Multiple files, dependencies, configuration
- ✅ **Well-structured**: Good architecture to learn from

**Score: 6/10** - Good for learning but complex

**mitsuhiko/agent-stuff/answer.ts**:
- ✅ **Simple**: Single file, easy to understand
- ✅ **Focused**: Core functionality only
- ✅ **Self-contained**: No external dependencies
- ✅ **Educational**: Demonstrates the pattern clearly
- ✅ **Extensible**: Easy to build upon

**Score: 10/10** - Perfect for minimal reference implementation

---

## 6. Detailed Feature Analysis

### 6.1 Extraction Schema Comparison

**sids/pi-extensions/answer** uses a rich schema:
```typescript
interface ExtractedQuestion {
  id?: string;              // Stable identifier
  header?: string;         // Grouping header
  question: string;         // The question text
  context?: string;        // Optional context
  options?: ExtractedQuestionOption[];  // Multiple choice options
}

interface ExtractedQuestionOption {
  label: string;            // Short answer text
  description: string;     // Detailed description
}
```

**mitsuhiko/agent-stuff/answer.ts** uses a basic schema:
```typescript
interface ExtractedQuestion {
  question: string;         // The question text
  context?: string;        // Optional context
}
```

### 6.2 Configuration Options Comparison

**sids/pi-extensions/answer** settings:
```json
{
  "answer": {
    "systemPrompt": "Custom extraction prompt...",
    "extractionModels": [
      { "provider": "openai-codex", "id": "gpt-5.4-mini" },
      { "provider": "github-copilot", "id": "gpt-5.4-mini" }
    ],
    "answerTemplates": [
      { "label": "Brief", "template": "{{answer}}" },
      { "label": "Need info", "template": "I need more details about: " }
    ],
    "drafts": {
      "enabled": true,
      "autosaveMs": 1000,
      "promptOnRestore": true
    }
  }
}
```

**mitsuhiko/agent-stuff/answer.ts** settings:
- Hardcoded system prompt
- Hardcoded model preferences
- No configuration options

### 6.3 Navigation & UX Comparison

**sids/pi-extensions/answer** navigation:
- Tab/Shift+Tab: Next/Previous question (without committing)
- Enter: Commit current answer and move to next
- ↑/↓: Select option (when options available)
- 1-9: Jump to option number
- Type: Switch to custom answer input
- Shift+Enter: Newline in custom answer
- Ctrl+T: Apply next answer template
- Ctrl+C: Cancel
- Esc: Keep editing (on confirmation)

**mitsuhiko/agent-stuff/answer.ts** navigation:
- Tab/Shift+Tab: Next/Previous question
- Enter: Commit current answer and move to next
- ↑/↓: Navigate questions (when editor empty)
- Ctrl+C: Cancel
- Esc: Keep editing (on confirmation)

---

## 7. Security Review Summary

### 7.1 sids/pi-extensions/answer (pi-answer)

**Risk Assessment**: **MEDIUM**

**Concerns**:
1. **External dependency**: `@siddr/pi-shared-qna@^0.1.0` - same maintainer, but still external
2. **Network access**: Can make API calls to configured LLMs
3. **File system access**: Reads settings files from agent directory
4. **Session manipulation**: Can append custom entries to session

**Mitigations**:
1. ✅ Open source code - fully auditable
2. ✅ No obfuscated code
3. ✅ Clear purpose and functionality
4. ✅ MIT license - permissive
5. ✅ Active maintenance by known maintainer
6. ✅ Version pinning available at package level

**Recommendation**: **ACCEPTABLE FOR TRIAL** with the understanding that:
- The external dependency `@siddr/pi-shared-qna` should be reviewed
- Top-level version pinning doesn't fully pin transitive dependencies
- Rollback is simple: `pi uninstall pi-answer`

### 7.2 mitsuhiko/agent-stuff/answer.ts

**Risk Assessment**: **LOW**

**Concerns**:
1. **Network access**: Can make API calls to configured LLMs
2. **Session manipulation**: Can append custom entries to session

**Mitigations**:
1. ✅ Open source code - fully auditable
2. ✅ No obfuscated code
3. ✅ No external dependencies
4. ✅ Single file - easy to review
5. ✅ MIT license (assumed)
6. ✅ Minimal trust surface

**Recommendation**: **SAFE** - Minimal risk profile

---

## 8. Pinning Limitations & Rollback Path

### 8.1 sids/pi-extensions/answer (pi-answer)

**Pinning Limitations**:
- `pi install npm:pi-answer` pins the top-level package version
- However, `pi-answer` depends on `@siddr/pi-shared-qna@^0.1.0` (caret range)
- This means transitive dependencies can update within the caret range
- No lockfile mechanism in Pi's package manager
- **Risk**: Breaking changes in pi-shared-qna could affect pi-answer

**Rollback Path**:
1. Uninstall: `pi uninstall pi-answer`
2. Reinstall specific version: `pi install npm:pi-answer@0.1.4`
3. Clear cache if needed: Manual cache clearing

**Recommendation**: Pin to specific version: `pi install npm:pi-answer@0.1.4`

### 8.2 mitsuhiko/agent-stuff/answer.ts

**Pinning Limitations**:
- Manual file placement - no version pinning
- User must manually update to get changes
- No dependency management

**Rollback Path**:
1. Delete the file: `rm ~/.pi/agent/extensions/answer.ts`
2. Restart Pi

**Recommendation**: Use git to track the file if version control is needed

---

## 9. Final Recommendation

### 9.1 For Packaged Trial: **sids/pi-extensions/answer (pi-answer)**

**Rationale**:
- ✅ Production-ready with comprehensive features
- ✅ Professional packaging and easy installation
- ✅ Excellent documentation and testing
- ✅ Active maintenance by known maintainer
- ✅ Solves real user needs (draft persistence, templates, options)
- ⚠️ Requires security review of external dependency

**Trial Plan**:
1. Run security review of `@siddr/pi-shared-qna`
2. Install pinned version: `pi install npm:pi-answer@0.1.4`
3. Test with various scenarios
4. Evaluate UX and feature completeness
5. Document any issues or missing features

### 9.2 For Minimal Reference Implementation: **mitsuhiko/agent-stuff/answer.ts**

**Rationale**:
- ✅ Perfect for learning and understanding the pattern
- ✅ Minimal, self-contained implementation
- ✅ No external dependencies
- ✅ Easy to modify and extend
- ❌ Not suitable for production use as-is

**Usage Plan**:
1. Copy the file locally for reference
2. Use as starting point for custom implementation
3. Borrow proven features from sids/pi-extensions/answer as needed

### 9.3 Long-term Decision: **Build Alps-owned Extension**

**Rationale**:
- Both third-party options have tradeoffs
- sids/pi-extensions/answer is feature-rich but has external dependency
- mitsuhiko/agent-stuff/answer.ts is minimal but lacks features
- An Alps-owned extension can:
  - Cherry-pick the best features from both
  - Avoid external dependencies
  - Maintain full control over trust surface
  - Tailor to Alps-specific needs

**Recommended Features to Include**:
- ✅ Question extraction with options support (from sids)
- ✅ Draft persistence (from sids)
- ✅ Answer templates (from sids)
- ✅ Configurable model preferences (from sids)
- ✅ Minimal, clean implementation (inspired by mitsuhiko)
- ❌ Avoid external dependencies (learn from mitsuhiko)

---

## 10. Acceptance Criteria Verification

✅ **Feature comparison covers extraction schema, UI behaviour, settings/configuration, draft persistence, tests, packaging shape, and maintenance burden**
- All aspects thoroughly covered in sections 1-4

✅ **Comparison uses explicit names: sids/pi-extensions/answer and mitsuhiko/agent-stuff/extensions/answer.ts**
- Names used consistently throughout the document

✅ **Recommendation is clear about which candidate is best for packaged trial versus minimal reference implementation**
- Clear recommendations in sections 5 and 9

---

## Appendix A: Command Reference

### sids/pi-extensions/answer (pi-answer)
```bash
# Installation
pi install npm:pi-answer

# Usage
/answer

# Or via shortcut
Ctrl+.
```

### mitsuhiko/agent-stuff/answer.ts
```bash
# Manual installation
cp answer.ts ~/.pi/agent/extensions/

# Usage
/answer

# Or via shortcut
Ctrl+.
```

---

## Appendix B: File Structure Comparison

### sids/pi-extensions/answer/
```
answer/
├── index.ts              # Main extension entry point
├── qna-adapter.ts        # Q&A adapter and draft management
├── utils.ts              # Utilities, types, and helpers
├── package.json          # Package configuration
├── README.md             # Comprehensive documentation
├── CHANGELOG.md          # Version history
└── tests/
    ├── utils.test.ts     # Utility function tests
    └── qna-adapter.test.ts # Adapter tests
```

### mitsuhiko/agent-stuff/extensions/
```
extensions/
└── answer.ts            # Single-file implementation
```

---

## Appendix C: Key Code Differences

### Model Selection (sids/pi-extensions/answer)
**Key Advantage**: Configurable model preferences allow users to customize extraction behavior without code changes.

```typescript
// Configurable model preferences
const modelPreferences: ModelPreference[] = [
  { provider: "openai-codex", id: "gpt-5.4-mini" },
  { provider: "github-copilot", id: "gpt-5.4-mini" },
  // ... more models
];

async function selectExtractionModel(currentModel, modelRegistry, modelPreferences) {
  // Try each preferred model in order
  for (const preference of modelPreferences) {
    const model = modelRegistry.find(preference.provider, preference.id);
    if (!model) continue;
    const auth = await modelRegistry.getApiKeyAndHeaders(model);
    if (auth.ok) return model;
  }
  return currentModel;
}
```

### Model Selection (mitsuhiko/agent-stuff/answer.ts)
**Limitation**: Hardcoded model IDs mean users cannot customize extraction models without modifying source code.

```typescript
// Hardcoded model preferences
const CODEX_MODEL_ID = "gpt-5.3";
const HAIKU_MODEL_ID = "claude-haiku-4-5";

async function selectExtractionModel(currentModel, modelRegistry) {
  // Prefer GPT-5.3, then haiku, then current model
  const codexModel = modelRegistry.find("openai-codex", CODEX_MODEL_ID);
  if (codexModel) {
    const auth = await modelRegistry.getApiKeyAndHeaders(codexModel);
    if (auth.ok) return codexModel;
  }
  // ... haiku fallback
  return currentModel;
}
```

> **Note**: The hardcoded model approach in mitsuhiko's implementation is simpler but less flexible. sids' configurable approach is more maintainable for production use where model availability and preferences may change over time.

---

*Comparison completed on 2026-05-11. For the latest information, check the respective repositories.*