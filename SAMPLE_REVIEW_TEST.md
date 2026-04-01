# Sample File for PR Review Testing

This file has some intentional issues for testing the AI review feature.

```rust
// Example Rust code with issues
fn main() {
    let result = risky_operation().unwrap();  // Issue: .unwrap() can panic
    unsafe {                                  // Issue: unsafe block without SAFETY comment
        let ptr = std::ptr::null_mut();
    }
    todo!();  // Issue: unimplemented code
}

fn risky_operation() -> Result<String, &'static str> {
    Ok(String::from("success"))
}
```

## Notes
- This PR is for testing the PM Dashboard GitHub integration
- Feel free to close after testing
