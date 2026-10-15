# Sally privacy policy — draft for HeySalad Inc. approval

Proposed publication URL: https://heysalad.ai/sally/privacy  
Prepared: 15 October 2026. Not yet the published policy. The upstream logging/retention items below must be resolved before publishing.

Sally is operated by HeySalad Inc. Contact peter@heysalad.ai with privacy, support, access or deletion requests.

## What Sally processes

When you use Sally from ChatGPT or Codex, Sally receives the tool inputs you choose to share: grocery list items, recipe text, requested servings, selected retailer, and supplied candidate product details. Those inputs can reveal dietary preferences. Avoid including information you do not want processed. Sally returns suggested matches, explanations, shopping lists and manual extension handoff instructions.

Signed-in tools use your Sally account. The email sign-in step processes your email address and a temporary verification code to establish identity. Sally’s MCP OAuth service stores the minimum necessary account identifier and encrypted upstream session information to service authorised requests. It does not receive retailer passwords or card details, and it never checks out or pays for you.

Anonymous matching uses a guest Sally session. The MCP service derives a pseudonymous daily quota identifier from the connection’s IP address using a secret keyed hash. It does not store the raw IP in its D1 usage database. Cloudflare necessarily processes network traffic to operate and protect the service.

## Usage records and retention

The MCP D1 database records a keyed pseudonymous subject identifier, tool name, result status, request duration and timestamp. It does not store grocery lists, recipes, product text, email addresses, raw IP addresses or tokens in those usage rows. Usage records are scheduled for deletion after 30 days; expired quota rows are cleared by daily maintenance.

Browser-bound consent and sign-in transactions expire after ten minutes. Codes are not persisted by the MCP service. OAuth access tokens last one hour and refresh grants last up to one day. Provider OAuth storage hashes tokens/codes and encrypts application properties. Short-lived anonymous upstream credentials are stored only as required to authenticate to Sally.

**Release item:** document and reconcile the owning Sally API’s account-data, OTP/debug-log, run-observability and inference-provider retention before publication. The inspected dev API includes email/code debug logs and line/product debug events. This draft does not represent those unresolved practices as absent or imply that the MCP database’s retention controls apply to every upstream system.

## Service providers and disclosures

Cloudflare hosts the MCP Worker, OAuth KV and D1. Sally’s API processes shopping and recipe data and uses OpenAI for the matching and recipe services. ChatGPT or Codex also handles the conversation under its own terms and settings. Retailer content and product images may be requested from retailer domains when you view or follow product links. Sally does not claim to be affiliated with the supported retailers.

Inputs are used to fulfill requests, authenticate access, enforce quotas, diagnose failures and maintain service reliability. Sally does not require payment information for these tools. Any additional use, retention or transfer details must be reconciled with the production service configuration and HeySalad Inc.’s approved policy before publication.

## Your controls

You choose what to share. Disconnect Sally in ChatGPT or Codex to stop future access; request grant revocation or account-data deletion at peter@heysalad.ai. Contact the same address for access/correction requests and applicable privacy rights. Policies and processing practices can change; publish an effective date and notify users as appropriate when the approved policy changes.
