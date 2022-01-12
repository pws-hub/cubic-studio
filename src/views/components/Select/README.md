Custom Select Form Tag (MarkoJS)
=================

## Props

`class`: Assign class attributes to the select input
  - **type**: *string*
  - **default**: undefined

`options`: List of options the user will select from
  - **type**: *array*
  - **default**: undefined

Example of options

```javascript
[
  { label: "Ghana", value: "GH" },
  { label: "United States", value: "US" },
]
```

the `label` (optional) field is gonna be displayed and the `value` field will be returned. If no `label`, `value` will be displayed in the select input by default.


`value`: Manually set value of the select. Can also be use to set initial or default selected value.
  - **type**: *string|number*
  - **default**: undefined

`size`: Define the height of the select input 
  - **type**: *string*
  - **values**: xl|lg|md|sm
  - **default**: md

`fontSize`: Adjust the font-size of the dropdown text content
  - **type**: *string class*
  - **default**: font-medium-2

`style`: Customize the select with CSS properties
  - **type**: *string*
  - **default**: undefined

`placeholder`: Define placeholder text to display when select is empty value
  - **type**: *string*
  - **default**: -- Select Options --

`maxHeight`: Define the maximum height of the select dropdown. 
  - **type**: *pixel*
  - **default**: 220px

`returnAll`: Instruct the select component to return the full set of an option: `{ label, value }` when a select happen. Otherwize only `value` is returned.
  - **type**: *boolean*
  - **default**: false


## Events

`on-select`: Fired when a user select an option and return the value


## Usage

```javascript
<Select placeholder="Destination Country"
        value="GH"
        options=[
          { label: "Ghana", value: "GH" },
          { label: "United States", value: "US" },
        ]
        class="my-select-class"
        style="background: grey;"
        maxHeight="400px"
        returnAll=true
        on-select('handleSelect')/>
```