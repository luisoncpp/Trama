# Layout Directives Test Document

This file is used to validate Quill round-trip for markdown layout directives.

<!-- trama:center:start -->

Centered block: line 1.

Centered block: line 2.

<!-- trama:center:end -->

Normal paragraph before spacer.

<!-- trama:spacer lines=1 -->

Normal paragraph before page break.

<!-- trama:pagebreak -->

## Section After Page Break

This section should remain after serialization.

<!-- trama:custom mode=soft -->

Unknown trama directive should be preserved as-is in copy-as-markdown.

# Layout Directives Test Document

This file is used to validate Quill round-trip for markdown layout directives.

<!-- trama:center:start -->

Centered block: line 1. Centered block: line 2.

<!-- trama:center:end -->

Normal paragraph before spacer.

<!-- trama:spacer lines=2 -->

Normal paragraph before page break.

<!-- trama:pagebreak -->

## Section After Page Break

This section should remain after serialization.

<!-- trama:custom mode=soft -->

Unknown trama directive should be preserved as-is in copy-as-markdown.

afdaas

a

<!-- trama:spacer lines=6 -->

b