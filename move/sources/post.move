module blobcast::post {
    use std::string::String;
    use std::option::{Self, Option};
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use blobcast::events;

    /// Immutable casting post object registered on-chain.
    public struct Post has key, store {
        id: UID,
        author: address,
        walrus_blob_id: String,
        blob_hash: vector<u8>,
        content_type: u8,
        visibility: u8,
        reply_to: Option<ID>,
        repost_of: Option<ID>,
        like_count: u64,
        comment_count: u64,
        repost_count: u64,
        created_at: u64
    }

    /// Registers a new cast post on the Sui blockchain.
    public entry fun create_post(
        walrus_blob_id: String,
        blob_hash: vector<u8>,
        content_type: u8,
        visibility: u8,
        reply_to_opt: Option<ID>,
        repost_of_opt: Option<ID>,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let id = object::new(ctx);
        let post_id = object::uid_to_inner(&id);
        let created_at = sui::clock::timestamp_ms(clock);

        let post = Post {
            id,
            author: sender,
            walrus_blob_id,
            blob_hash,
            content_type,
            visibility,
            reply_to: reply_to_opt,
            repost_of: repost_of_opt,
            like_count: 0,
            comment_count: 0,
            repost_count: 0,
            created_at
        };

        // Share the Post object so that other users can verifiably read, like, and tip it on-chain!
        transfer::share_object(post);

        // Emit indexer events
        events::emit_post_created(post_id, sender, walrus_blob_id, content_type, created_at);
    }

    // --- Package Internal Mutation Helpers ---

    public(package) fun increment_like_count(post: &mut Post) {
        post.like_count = post.like_count + 1;
    }

    public(package) fun increment_repost_count(post: &mut Post) {
        post.repost_count = post.repost_count + 1;
    }

    public(package) fun increment_comment_count(post: &mut Post) {
        post.comment_count = post.comment_count + 1;
    }

    // --- Getters ---
    public fun get_author(post: &Post): address {
        post.author
    }

    public fun get_walrus_blob_id(post: &Post): &String {
        &post.walrus_blob_id
    }

    public fun get_like_count(post: &Post): u64 {
        post.like_count
    }
}
