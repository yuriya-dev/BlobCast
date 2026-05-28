module blobcast::events {
    use sui::object::ID;
    use std::string::String;

    /// Emitted when a new immutable post is verifiably registered on-chain.
    public struct PostCreated has copy, drop {
        post_id: ID,
        author: address,
        walrus_blob_id: String,
        content_type: u8,
        created_at: u64
    }

    /// Emitted when a post is signed and liked by a user.
    public struct LikeCreated has copy, drop {
        post_id: ID,
        user: address,
        created_at: u64
    }

    /// Emitted when a post creator is verifiably tipped SUI.
    public struct TipEvent has copy, drop {
        sender: address,
        receiver: address,
        amount: u64,
        post_id: ID,
        created_at: u64
    }

    /// Emitted when a new profile is verifiably created on-chain.
    public struct ProfileCreated has copy, drop {
        profile_id: ID,
        owner: address,
        username: String,
        created_at: u64
    }

    /// Public package helpers to emit these events.
    public(package) fun emit_post_created(
        post_id: ID,
        author: address,
        walrus_blob_id: String,
        content_type: u8,
        created_at: u64
    ) {
        sui::event::emit(PostCreated {
            post_id,
            author,
            walrus_blob_id,
            content_type,
            created_at
        });
    }

    public(package) fun emit_like_created(
        post_id: ID,
        user: address,
        created_at: u64
    ) {
        sui::event::emit(LikeCreated {
            post_id,
            user,
            created_at
        });
    }

    public(package) fun emit_tip_event(
        sender: address,
        receiver: address,
        amount: u64,
        post_id: ID,
        created_at: u64
    ) {
        sui::event::emit(TipEvent {
            sender,
            receiver,
            amount,
            post_id,
            created_at
        });
    }

    public(package) fun emit_profile_created(
        profile_id: ID,
        owner: address,
        username: String,
        created_at: u64
    ) {
        sui::event::emit(ProfileCreated {
            profile_id,
            owner,
            username,
            created_at
        });
    }
}
