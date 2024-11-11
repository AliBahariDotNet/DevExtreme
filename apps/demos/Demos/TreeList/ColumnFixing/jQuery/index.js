$(() => {
  $('#employees').dxTreeList({
    dataSource: employees,
    keyExpr: 'ID',
    parentIdExpr: 'Head_ID',
    columnAutoWidth: true,
    showBorders: true,
    columnFixing: {
      enabled: true,
    },
    showRowLines: true,
    expandedRowKeys: [1],
    columns: [
      {
        caption: 'Employee',
        fixed: true,
        calculateCellValue(data) {
          return [data.Title,
            data.FirstName, data.LastName]
            .join(' ');
        },
      },
      {
        dataField: 'Position',
        alignment: 'right',
      },
      {
        dataField: 'Address',
        fixed: true,
        fixedPosition: 'sticky'
      },
      'City',
      'Zipcode',
      'State',
      {
        dataField: 'Department',
        fixed: true,
        fixedPosition: 'right',
      },
      {
        dataField: 'BirthDate',
        dataType: 'date',
      }, {
        dataField: 'HireDate',
        dataType: 'date',
      },
      'HomePhone',
      'MobilePhone',
      {
        dataField: 'Email',
        fixed: true,
        fixedPosition: 'sticky',
      },
      {
        dataField: 'Skype',
      },
    ],
  });
});
