module blobcast::interaction {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use blobcast::post::{Self, Post};
    use blobcast::events;

    /// Verifiable signed Like record object.
    public struct Like has key {
        id: UID,
        user: address,
        post_id: ID,
        created_at: u64
    }

    /// Verifiable signed Follow relationship record object.
    public struct Follow has key {
        id: UID,
        follower: address,
        following: address,
        created_at: u64
    }

    /// verifiably signs and likes a shared post object on-chain.
    public entry fun like_post(
        post: &mut Post,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let post_id = object::id(post);
        let created_at = sui::clock::timestamp_ms(clock);

        // Increment the like counter in the shared Post object
        post::increment_like_count(post);

        let id = object::new(ctx);
        let like = Like {
            id,
            user: sender,
            post_id,
            created_at
        };

        // Transfer the Like receipt directly to the user's wallet
        transfer::transfer(like, sender);

        // Emit indexer events
        events::emit_like_created(post_id, sender, created_at);
    }

    /// Verifiably registers a follower connection on-chain.
    public entry fun follow_user(
        target_creator: address,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let created_at = sui::clock::timestamp_ms(clock);

        let id = object::new(ctx);
        let follow = Follow {
            id,
            follower: sender,
            following: target_creator,
            created_at
        };

        // Transfer the Follow object directly to the follower
        transfer::transfer(follow, sender);
    }
}
