extern crate proc_macro;
extern crate syn;
#[macro_use]
extern crate quote;

use proc_macro::TokenStream;

#[proc_macro_derive(DataContract, attributes(abi, abi_data_fn))]
pub fn data_contract(input: TokenStream) -> TokenStream {
    // Construct a string representation of the type definition
    let s = input.to_string();

    // Parse the string representation
    let ast = syn::parse_derive_input(&s).unwrap();

    // Build the impl
    let gen = impl_data_contract(&ast);

    // Return the generated impl
    gen.parse().unwrap()
}

fn require_attribute<'a>(ast: &'a syn::DeriveInput, name: &str) -> &'a syn::Lit {
    let attribute = &ast
        .attrs
        .iter()
        .find(|e| e.name() == name)
        .expect(&format!("Named attribute {} is required", name));
    if let syn::MetaItem::NameValue(_, attribute_value) = &attribute.value {
        return attribute_value;
    } else {
        panic!("Attribute {} must have a value", name);
    }
}

fn impl_data_contract(ast: &syn::DeriveInput) -> quote::Tokens {
    let name = &ast.ident;
    let abi = require_attribute(ast, "abi");
    let abi_data_fn = require_attribute(ast, "abi_data_fn");

    quote! {
        impl #name {
            pub async fn load(
                context: &std::sync::Arc<::ton_client::ClientContext>,
                address: &crate::blockchain::BlockchainContractAddress,
            ) -> anyhow::Result<#name>
            {
                let abi = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/resources/", #abi));
                let contract = crate::blockchain::contract::GoshContract::new(address, (#abi, abi));
                let content = crate::blockchain::contract::ContractRead::read_state(
                    &contract,
                    context,
                    #abi_data_fn,
                    None
                ).await?;
                let obj = ::serde_json::from_value::<#name>(content)
                    .map_err(|e| anyhow::Error::from(e));
                return obj;
            }
        }
    }
}
